import { caseCreateSchema, caseUpdateSchema, listQuerySchema } from "@chronostek/contracts";
import { Prisma, withTenant } from "@chronostek/database";
import { Router } from "express";
import { allowedBranches, assertBranch, caseAssignmentFilter } from "../../lib/tenant.js";
import { normalizeSearch } from "../../lib/field-crypto.js";
import { forbidden, notFound } from "../../lib/app-error.js";
import { assertClientBranch, assertLegalArea, assertUserBranchAccess } from "../../lib/entity-access.js";
import { requireAuth, requirePermission } from "../auth/auth.middleware.js";

export const casesRouter = Router();

casesRouter.get("/", requireAuth, requirePermission("case.read"), async (request, response) => {
  const auth = request.auth!;
  const query = listQuerySchema.parse(request.query);
  const branches = allowedBranches(auth, query.branchId);
  const where: Prisma.LegalCaseWhereInput = { tenantId: auth.tenantId, ...(branches ? { branchId: { in: branches } } : {}), ...(query.legalAreaId ? { legalAreaId: query.legalAreaId } : {}), ...(query.status ? { status: query.status as never } : {}), ...caseAssignmentFilter(auth), ...(query.responsibleId ? { assignments: { some: { userId: query.responsibleId } } } : {}), ...(query.search ? { OR: [{ processNumberSearch: { contains: normalizeSearch(query.search) } }, { caseType: { contains: query.search, mode: "insensitive" } }, { parties: { some: { client: { searchName: { contains: normalizeSearch(query.search) } } } } }] } : {}) };
  const data = await withTenant(auth.tenantId, async (tx) => {
    const [items, total] = await Promise.all([
      tx.legalCase.findMany({ where, include: { branch: { select: { name: true } }, legalArea: { select: { name: true } }, parties: { where: { isPrimary: true }, include: { client: { select: { id: true, name: true } } } }, assignments: { include: { user: { select: { name: true } } } } }, orderBy: { updatedAt: "desc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      tx.legalCase.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  });
  response.json(data);
});

casesRouter.post("/", requireAuth, requirePermission("case.create"), async (request, response) => {
  const auth = request.auth!;
  const input = caseCreateSchema.parse(request.body);
  assertBranch(auth, input.branchId);
  const item = await withTenant(auth.tenantId, async (tx) => {
    await Promise.all([
      assertLegalArea(tx, auth.tenantId, input.legalAreaId),
      assertClientBranch(tx, auth.tenantId, input.clientId, input.branchId),
      assertUserBranchAccess(tx, auth.tenantId, input.responsibleUserId, input.branchId),
      assertUserBranchAccess(tx, auth.tenantId, input.attorneyId, input.branchId),
    ]);
    const legalCase = await tx.legalCase.create({ data: {
      tenantId: auth.tenantId, branchId: input.branchId, legalAreaId: input.legalAreaId, caseType: input.caseType, entryDate: input.entryDate, notes: input.notes,
      parties: { create: { clientId: input.clientId, isPrimary: true } },
      assignments: { create: [input.responsibleUserId ? { userId: input.responsibleUserId, type: "INTERNAL_OWNER" as const, isPrimary: true } : null, input.attorneyId ? { userId: input.attorneyId, type: "ATTORNEY" as const, isPrimary: true } : null].filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)) },
    } });
    await tx.auditLog.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, entityType: "LEGAL_CASE", entityId: legalCase.id, action: "CASE_CREATED", description: `Processo ${legalCase.caseType} criado` } });
    return legalCase;
  });
  response.status(201).json({ id: item.id });
});

casesRouter.patch("/:id", requireAuth, async (request, response) => {
  const auth = request.auth!;
  if (!auth.permissions.includes("case.update") && !auth.permissions.includes("case.update_assigned")) throw forbidden();
  const input = caseUpdateSchema.parse(request.body);
  const assignmentChange = Object.prototype.hasOwnProperty.call(request.body, "responsibleUserId") || Object.prototype.hasOwnProperty.call(request.body, "attorneyId");
  if (assignmentChange && !auth.permissions.includes("case.update")) throw forbidden("Você não pode reatribuir responsáveis.");
  const result = await withTenant(auth.tenantId, async (tx) => {
    const existing = await tx.legalCase.findFirst({ where: { tenantId: auth.tenantId, id: String(request.params.id), ...caseAssignmentFilter(auth) } });
    if (!existing) throw notFound();
    assertBranch(auth, existing.branchId);
    const { responsibleUserId, attorneyId, ...caseData } = input;
    const updated = await tx.legalCase.update({ where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } }, data: { ...caseData, processNumberSearch: input.processNumber ? normalizeSearch(input.processNumber).replace(/\s/g, "") : undefined, lastProgressAt: input.lastProgress ? new Date() : undefined } });
    if (assignmentChange) {
      const assignments = [
        responsibleUserId ? { userId: responsibleUserId, type: "INTERNAL_OWNER" as const, isPrimary: true } : null,
        attorneyId ? { userId: attorneyId, type: "ATTORNEY" as const, isPrimary: true } : null,
      ].filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
      for (const assignment of assignments) {
        const eligible = await tx.user.findFirst({ where: { tenantId: auth.tenantId, id: assignment.userId, status: "ACTIVE", OR: [{ hasAllBranches: true }, { branchAccesses: { some: { branchId: existing.branchId } } }] } });
        if (!eligible) throw forbidden("O responsável selecionado não possui acesso à filial do processo.");
      }
      await tx.caseAssignment.deleteMany({ where: { tenantId: auth.tenantId, caseId: existing.id, type: { in: ["INTERNAL_OWNER", "ATTORNEY"] } } });
      if (assignments.length) await tx.caseAssignment.createMany({ data: assignments.map((assignment) => ({ tenantId: auth.tenantId, caseId: existing.id, ...assignment })) });
      await tx.auditLog.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, entityType: "LEGAL_CASE", entityId: existing.id, action: "CASE_REASSIGNED", description: "Responsáveis do processo atualizados" } });
    }
    if (input.status && input.status !== existing.status) await tx.auditLog.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, entityType: "LEGAL_CASE", entityId: existing.id, action: "CASE_STATUS_UPDATED", description: `Status alterado de ${existing.status} para ${input.status}` } });
    if (input.processNumber && input.processNumber !== existing.processNumber) await tx.auditLog.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, entityType: "LEGAL_CASE", entityId: existing.id, action: "CASE_DISTRIBUTED", description: "Número do processo adicionado e distribuição registrada" } });
    if (input.lastProgress && input.lastProgress !== existing.lastProgress) await tx.auditLog.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, entityType: "LEGAL_CASE", entityId: existing.id, action: "CASE_PROGRESS_UPDATED", description: "Último andamento atualizado" } });
    if (!assignmentChange && !input.status && !input.processNumber && !input.lastProgress) await tx.auditLog.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, entityType: "LEGAL_CASE", entityId: existing.id, action: "CASE_UPDATED", description: "Processo atualizado" } });
    return updated;
  });
  response.json(result);
});

casesRouter.get("/:id", requireAuth, requirePermission("case.read"), async (request, response) => {
  const auth = request.auth!;
  const branches = allowedBranches(auth);
  const item = await withTenant(auth.tenantId, (tx) => tx.legalCase.findFirst({ where: { tenantId: auth.tenantId, id: String(request.params.id), ...(branches ? { branchId: { in: branches } } : {}), ...caseAssignmentFilter(auth) }, include: { branch: true, legalArea: true, parties: { include: { client: true } }, assignments: { include: { user: { select: { id: true, name: true } } } }, deadlines: { orderBy: { dueAt: "asc" } }, documents: { orderBy: { createdAt: "desc" } }, checklists: { include: { items: { orderBy: { position: "asc" } } } }, feeContracts: { include: { installments: true } } } }));
  if (!item) throw notFound();
  response.json(item);
});
