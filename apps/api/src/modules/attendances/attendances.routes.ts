import { attendanceCreateSchema, attendanceUpdateSchema, caseCreateBaseSchema, clientCreateSchema, deletionReasonSchema, listQuerySchema } from "@chronostek/contracts";
import { Prisma, withTenant } from "@chronostek/database";
import { Router } from "express";
import { z } from "zod";
import { normalizeSearch } from "../../lib/field-crypto.js";
import { allowedBranches, assertBranch, attendanceAttorneyFilter } from "../../lib/tenant.js";
import { AppError, forbidden, notFound } from "../../lib/app-error.js";
import { assertClientBranch, assertLegalArea, assertUserBranchAccess } from "../../lib/entity-access.js";
import { createInitialChecklist } from "../../lib/initial-checklist.js";
import { recordAudit } from "../../lib/audit.js";
import { requireAuth, requirePermission } from "../auth/auth.middleware.js";

export const attendancesRouter = Router();

attendancesRouter.get("/", requireAuth, requirePermission("attendance.read"), async (request, response) => {
  const auth = request.auth!;
  const query = listQuerySchema.parse(request.query);
  if (query.deleted !== "exclude" && !auth.permissions.includes("attendance.restore")) throw forbidden();
  const branches = allowedBranches(auth, query.branchId);
  const where: Prisma.AttendanceWhereInput = { tenantId: auth.tenantId, ...(query.deleted === "only" ? { deletedAt: { not: null } } : query.deleted === "exclude" ? { deletedAt: null } : {}), ...(branches ? { branchId: { in: branches } } : {}), ...attendanceAttorneyFilter(auth), ...(query.status ? { status: query.status as never } : {}), ...(query.legalAreaId ? { legalAreaId: query.legalAreaId } : {}), ...(query.search ? { OR: [{ clientName: { contains: query.search, mode: "insensitive" } }, { email: { contains: query.search, mode: "insensitive" } }] } : {}) };
  const data = await withTenant(auth.tenantId, async (tx) => {
    const [items, total] = await Promise.all([
      tx.attendance.findMany({ where, include: { branch: { select: { name: true } }, legalArea: { select: { name: true } }, attorney: { select: { name: true } } }, orderBy: { occurredAt: "desc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      tx.attendance.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  });
  response.json(data);
});

attendancesRouter.get("/:id", requireAuth, requirePermission("attendance.read"), async (request, response) => {
  const auth = request.auth!;
  const branches = allowedBranches(auth);
  const item = await withTenant(auth.tenantId, (tx) => tx.attendance.findFirst({
    where: { tenantId: auth.tenantId, id: String(request.params.id), ...(branches ? { branchId: { in: branches } } : {}), ...attendanceAttorneyFilter(auth) },
    include: { branch: true, legalArea: true, attorney: { select: { id: true, name: true } }, client: { select: { id: true, name: true } }, convertedCase: { select: { id: true, processNumber: true, caseType: true } } },
  }));
  if (!item) throw notFound();
  if (item.deletedAt && !auth.permissions.includes("attendance.restore")) throw notFound();
  response.json(item);
});

attendancesRouter.patch("/:id", requireAuth, requirePermission("attendance.update"), async (request, response) => {
  const auth = request.auth!;
  const input = attendanceUpdateSchema.parse(request.body);
  const item = await withTenant(auth.tenantId, async (tx) => {
    const branches = allowedBranches(auth);
    const existing = await tx.attendance.findFirst({ where: { tenantId: auth.tenantId, id: String(request.params.id), deletedAt: null, ...(branches ? { branchId: { in: branches } } : {}) } });
    if (!existing) throw notFound();
    if (input.branchId) assertBranch(auth, input.branchId);
    const targetBranchId = input.branchId ?? existing.branchId;
    await Promise.all([
      assertLegalArea(tx, auth.tenantId, input.legalAreaId),
      assertUserBranchAccess(tx, auth.tenantId, input.attorneyId, targetBranchId),
      assertClientBranch(tx, auth.tenantId, input.clientId, targetBranchId),
    ]);
    const updated = await tx.attendance.update({ where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } }, data: input });
    await recordAudit(tx, auth, request, { module: "ATENDIMENTOS", entityType: "ATTENDANCE", entityId: updated.id, action: input.status && input.status !== existing.status ? "ATTENDANCE_STATUS_UPDATED" : "ATTENDANCE_UPDATED", description: input.status && input.status !== existing.status ? `Atendimento alterado para ${input.status}` : `Atendimento de ${updated.clientName} atualizado`, branchId: updated.branchId, before: existing, after: updated });
    return updated;
  });
  response.json({ id: item.id });
});

attendancesRouter.post("/", requireAuth, requirePermission("attendance.create"), async (request, response) => {
  const auth = request.auth!;
  const input = attendanceCreateSchema.parse(request.body);
  assertBranch(auth, input.branchId);
  const attendance = await withTenant(auth.tenantId, async (tx) => {
    await Promise.all([
      assertLegalArea(tx, auth.tenantId, input.legalAreaId),
      assertUserBranchAccess(tx, auth.tenantId, input.attorneyId, input.branchId),
      assertClientBranch(tx, auth.tenantId, input.clientId, input.branchId),
    ]);
    const item = await tx.attendance.create({ data: { tenantId: auth.tenantId, ...input } });
    await recordAudit(tx, auth, request, { module: "ATENDIMENTOS", entityType: "ATTENDANCE", entityId: item.id, action: "ATTENDANCE_CREATED", description: `Atendimento de ${item.clientName} criado`, branchId: item.branchId, after: item });
    return item;
  });
  response.status(201).json({ id: attendance.id });
});

const conversionSchema = z.object({
  createClient: z.boolean().default(true),
  createCase: z.boolean().default(true),
  client: clientCreateSchema.partial().optional(),
  case: caseCreateBaseSchema.omit({ clientId: true }).optional(),
});

attendancesRouter.post("/:id/convert", requireAuth, requirePermission("attendance.convert"), async (request, response) => {
  const auth = request.auth!;
  const input = conversionSchema.parse(request.body);
  const responsibleUserIds = [...new Set(
    input.case?.responsibleUserIds?.length
      ? input.case.responsibleUserIds
      : input.case?.responsibleUserId
        ? [input.case.responsibleUserId]
        : [],
  )];
  const result = await withTenant(auth.tenantId, async (tx) => {
    const attendance = await tx.attendance.findFirst({ where: { tenantId: auth.tenantId, id: String(request.params.id), deletedAt: null } });
    if (!attendance) throw notFound();
    assertBranch(auth, attendance.branchId);
    if (input.client?.primaryBranchId && input.client.primaryBranchId !== attendance.branchId) throw new AppError(422, "Vínculo inválido", "O cliente convertido deve permanecer na filial do atendimento.");
    let clientId = attendance.clientId;
    if (!clientId && input.createClient) {
      const client = await tx.client.create({ data: { tenantId: auth.tenantId, primaryBranchId: input.client?.primaryBranchId ?? attendance.branchId, responsibleUserId: input.client?.responsibleUserId ?? responsibleUserIds[0], name: input.client?.name ?? attendance.clientName, searchName: normalizeSearch(input.client?.name ?? attendance.clientName), email: input.client?.email ?? attendance.email, phone: input.client?.phone ?? attendance.phone, type: input.client?.type ?? "INDIVIDUAL", notes: input.client?.notes } });
      clientId = client.id;
      await tx.auditLog.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, entityType: "CLIENT", entityId: client.id, action: "CLIENT_CREATED_FROM_ATTENDANCE", description: `Cliente criado a partir do atendimento de ${attendance.clientName}` } });
    }
    let caseId: string | undefined;
    if (input.createCase) {
      if (!clientId || !input.case || !attendance.legalAreaId) throw new AppError(422, "Conversão incompleta", "Cliente, área jurídica e dados do processo são necessários para a conversão.");
      await Promise.all([
        assertLegalArea(tx, auth.tenantId, input.case.legalAreaId),
        assertClientBranch(tx, auth.tenantId, clientId, attendance.branchId),
        ...responsibleUserIds.map((userId) => assertUserBranchAccess(tx, auth.tenantId, userId, attendance.branchId)),
        assertUserBranchAccess(tx, auth.tenantId, input.case.attorneyId, attendance.branchId),
      ]);
      const legalCase = await tx.legalCase.create({ data: { tenantId: auth.tenantId, branchId: attendance.branchId, legalAreaId: input.case.legalAreaId, caseName: input.case.caseName, caseType: input.case.caseType ?? "Não classificado", processNumber: input.case.processNumber, processNumberSearch: input.case.processNumber ? normalizeSearch(input.case.processNumber).replace(/\s/g, "") : undefined, opposingParty: input.case.opposingParty, entryDate: input.case.entryDate, notes: input.case.notes, parties: { create: { clientId, isPrimary: true } }, assignments: { create: [...responsibleUserIds.map((userId, index) => ({ userId, type: "INTERNAL_OWNER" as const, isPrimary: index === 0 })), ...(input.case.attorneyId ? [{ userId: input.case.attorneyId, type: "ATTORNEY" as const, isPrimary: true }] : [])] } } });
      caseId = legalCase.id;
      await tx.auditLog.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, entityType: "LEGAL_CASE", entityId: legalCase.id, action: "CASE_CREATED_FROM_ATTENDANCE", description: `Processo criado a partir do atendimento de ${attendance.clientName}` } });
      await createInitialChecklist(tx, auth.tenantId, legalCase.id, input.case.legalAreaId, auth.userId);
    }
    await tx.attendance.update({ where: { tenantId_id: { tenantId: auth.tenantId, id: attendance.id } }, data: { clientId, convertedCaseId: caseId, status: caseId ? "CONVERTIDO_EM_PROCESSO" : "DIRECIONADO" } });
    await tx.auditLog.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, entityType: "ATTENDANCE", entityId: attendance.id, action: caseId ? "ATTENDANCE_CONVERTED_TO_CASE" : "ATTENDANCE_LINKED_TO_CLIENT", description: caseId ? "Atendimento convertido em cliente e processo" : "Atendimento vinculado ao cliente" } });
    return { clientId, caseId };
  });
  response.json(result);
});

attendancesRouter.delete("/:id", requireAuth, requirePermission("attendance.delete"), async (request, response) => {
  const auth = request.auth!;
  const { reason } = deletionReasonSchema.parse(request.body);
  await withTenant(auth.tenantId, async (tx) => {
    const branches = allowedBranches(auth);
    const existing = await tx.attendance.findFirst({ where: { tenantId: auth.tenantId, id: String(request.params.id), deletedAt: null, ...(branches ? { branchId: { in: branches } } : {}), ...attendanceAttorneyFilter(auth) } });
    if (!existing) throw notFound();
    const deleted = await tx.attendance.update({ where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } }, data: { deletedAt: new Date(), deletedById: auth.userId, deletionReason: reason } });
    await recordAudit(tx, auth, request, { module: "ATENDIMENTOS", entityType: "ATTENDANCE", entityId: deleted.id, action: "ATTENDANCE_DELETED", description: `Atendimento de ${deleted.clientName} excluído logicamente`, branchId: deleted.branchId, before: existing, after: deleted, reason });
  });
  response.status(204).send();
});

attendancesRouter.post("/:id/restore", requireAuth, requirePermission("attendance.restore"), async (request, response) => {
  const auth = request.auth!;
  const { reason } = deletionReasonSchema.parse(request.body);
  const restored = await withTenant(auth.tenantId, async (tx) => {
    const branches = allowedBranches(auth);
    const existing = await tx.attendance.findFirst({ where: { tenantId: auth.tenantId, id: String(request.params.id), deletedAt: { not: null }, ...(branches ? { branchId: { in: branches } } : {}), ...attendanceAttorneyFilter(auth) } });
    if (!existing) throw notFound();
    const item = await tx.attendance.update({ where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } }, data: { deletedAt: null, deletedById: null, deletionReason: null } });
    await recordAudit(tx, auth, request, { module: "ATENDIMENTOS", entityType: "ATTENDANCE", entityId: item.id, action: "ATTENDANCE_RESTORED", description: `Atendimento de ${item.clientName} restaurado`, branchId: item.branchId, before: existing, after: item, reason });
    return item;
  });
  response.json({ id: restored.id });
});
