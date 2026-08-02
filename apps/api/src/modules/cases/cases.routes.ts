import { caseCreateSchema, caseDeadlineCreateSchema, caseUpdateSchema, deletionReasonSchema, listQuerySchema } from "@chronostek/contracts";
import { Prisma, withTenant } from "@chronostek/database";
import { Router } from "express";
import { allowedBranches, assertBranch, caseAssignmentFilter } from "../../lib/tenant.js";
import { normalizeSearch } from "../../lib/field-crypto.js";
import { AppError, forbidden, notFound } from "../../lib/app-error.js";
import { assertClientBranch, assertLegalArea, assertUserBranchAccess } from "../../lib/entity-access.js";
import { createInitialChecklist } from "../../lib/initial-checklist.js";
import { recordAudit } from "../../lib/audit.js";
import { requireAuth, requirePermission } from "../auth/auth.middleware.js";

export const casesRouter = Router();

casesRouter.get("/", requireAuth, requirePermission("case.read"), async (request, response) => {
  const auth = request.auth!;
  const query = listQuerySchema.parse(request.query);
  if (query.deleted !== "exclude" && !auth.permissions.includes("case.restore")) throw forbidden();
  const branches = allowedBranches(auth, query.branchId);
  const where: Prisma.LegalCaseWhereInput = { tenantId: auth.tenantId, ...(query.deleted === "only" ? { deletedAt: { not: null } } : query.deleted === "exclude" ? { deletedAt: null } : {}), ...(branches ? { branchId: { in: branches } } : {}), ...(query.legalAreaId ? { legalAreaId: query.legalAreaId } : {}), ...(query.status ? { status: query.status as never } : {}), ...caseAssignmentFilter(auth), ...(query.responsibleId ? { assignments: { some: { userId: query.responsibleId } } } : {}), ...(query.search ? { OR: [{ processNumberSearch: { contains: normalizeSearch(query.search) } }, { caseName: { contains: query.search, mode: "insensitive" } }, { caseType: { contains: query.search, mode: "insensitive" } }, { parties: { some: { client: { searchName: { contains: normalizeSearch(query.search) } } } } }] } : {}) };
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
    const responsibleUserIds = [...new Set(input.responsibleUserIds ?? (input.responsibleUserId ? [input.responsibleUserId] : []))];
    await Promise.all([
      assertLegalArea(tx, auth.tenantId, input.legalAreaId),
      assertClientBranch(tx, auth.tenantId, input.clientId, input.branchId),
      ...responsibleUserIds.map((userId) => assertUserBranchAccess(tx, auth.tenantId, userId, input.branchId)),
      assertUserBranchAccess(tx, auth.tenantId, input.attorneyId, input.branchId),
    ]);
    const legalCase = await tx.legalCase.create({ data: {
      tenantId: auth.tenantId, branchId: input.branchId, legalAreaId: input.legalAreaId, caseName: input.caseName, caseType: input.caseType ?? "Não classificado",
      processNumber: input.processNumber, processNumberSearch: input.processNumber ? normalizeSearch(input.processNumber).replace(/\s/g, "") : undefined,
      opposingParty: input.opposingParty, entryDate: input.entryDate, notes: input.notes,
      parties: { create: { clientId: input.clientId, isPrimary: true } },
      assignments: { create: [...responsibleUserIds.map((userId, index) => ({ userId, type: "INTERNAL_OWNER" as const, isPrimary: index === 0 })), ...(input.attorneyId ? [{ userId: input.attorneyId, type: "ATTORNEY" as const, isPrimary: true }] : [])] },
    } });
    await recordAudit(tx, auth, request, { module: "PROCESSOS", entityType: "LEGAL_CASE", entityId: legalCase.id, action: "CASE_CREATED", description: `Processo ${legalCase.caseType} criado`, branchId: legalCase.branchId, after: legalCase });
    await createInitialChecklist(tx, auth.tenantId, legalCase.id, input.legalAreaId, auth.userId);
    return legalCase;
  });
  response.status(201).json({ id: item.id });
});

// #5 — Criar prazo de dentro do processo: filial, cliente e área são inferidos do
// processo; o prazo passa a constar no calendário, no dashboard e na lista geral
// (mesmo registro Deadline, sem duplicação) e no histórico do processo.
casesRouter.post("/:id/deadlines", requireAuth, requirePermission("deadline.manage"), async (request, response) => {
  const auth = request.auth!;
  const input = caseDeadlineCreateSchema.parse(request.body);
  const item = await withTenant(auth.tenantId, async (tx) => {
    const branches = allowedBranches(auth);
    const legalCase = await tx.legalCase.findFirst({
      where: { tenantId: auth.tenantId, id: String(request.params.id), deletedAt: null, ...(branches ? { branchId: { in: branches } } : {}), ...caseAssignmentFilter(auth) },
      include: { parties: { where: { isPrimary: true }, select: { clientId: true } } },
    });
    if (!legalCase) throw notFound();
    assertBranch(auth, legalCase.branchId);
    const clientId = legalCase.parties[0]?.clientId;
    if (!clientId) throw new AppError(422, "Vínculo inválido", "O processo não possui cliente vinculado para associar o prazo.");
    await assertUserBranchAccess(tx, auth.tenantId, input.responsibleUserId, legalCase.branchId);
    const deadline = await tx.deadline.create({ data: {
      tenantId: auth.tenantId, branchId: legalCase.branchId, caseId: legalCase.id, clientId, legalAreaId: legalCase.legalAreaId,
      responsibleUserId: input.responsibleUserId, title: input.title, type: input.type, dueAt: input.dueAt, priority: input.priority, notes: input.notes,
    } });
    const dueLabel = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" }).format(deadline.dueAt);
    await recordAudit(tx, auth, request, { module: "PRAZOS", entityType: "DEADLINE", entityId: deadline.id, action: "DEADLINE_CREATED", description: `Prazo ${deadline.title} criado`, branchId: deadline.branchId, after: deadline });
    await tx.auditLog.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, entityType: "LEGAL_CASE", entityId: legalCase.id, action: "DEADLINE_CREATED", description: `Prazo "${deadline.title}" criado para ${dueLabel}` } });
    return deadline;
  });
  response.status(201).json({ id: item.id });
});

casesRouter.patch("/:id", requireAuth, async (request, response) => {
  const auth = request.auth!;
  if (!auth.permissions.includes("case.update") && !auth.permissions.includes("case.update_assigned")) throw forbidden();
  const input = caseUpdateSchema.parse(request.body);
  const responsibleChange = Object.prototype.hasOwnProperty.call(request.body, "responsibleUserId") || Object.prototype.hasOwnProperty.call(request.body, "responsibleUserIds");
  const attorneyChange = Object.prototype.hasOwnProperty.call(request.body, "attorneyId");
  const assignmentChange = responsibleChange || attorneyChange;
  if (assignmentChange && !auth.permissions.includes("case.update")) throw forbidden("Você não pode reatribuir responsáveis.");
  const result = await withTenant(auth.tenantId, async (tx) => {
    const existing = await tx.legalCase.findFirst({ where: { tenantId: auth.tenantId, id: String(request.params.id), deletedAt: null, ...caseAssignmentFilter(auth) }, include: { assignments: true } });
    if (!existing) throw notFound();
    assertBranch(auth, existing.branchId);
    const { responsibleUserId, responsibleUserIds, attorneyId, ...caseData } = input;
    const updated = await tx.legalCase.update({ where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } }, data: { ...caseData, processNumberSearch: input.processNumber ? normalizeSearch(input.processNumber).replace(/\s/g, "") : undefined, lastProgressAt: input.lastProgress ? new Date() : undefined } });
    if (assignmentChange) {
      const ownerIds = responsibleChange
        ? [...new Set(responsibleUserIds ?? (responsibleUserId ? [responsibleUserId] : []))]
        : existing.assignments.filter((entry) => entry.type === "INTERNAL_OWNER").map((entry) => entry.userId);
      const attorneyIds = attorneyChange
        ? (attorneyId ? [attorneyId] : [])
        : existing.assignments.filter((entry) => entry.type === "ATTORNEY").map((entry) => entry.userId);
      const assignments = [
        ...ownerIds.map((userId, index) => ({ userId, type: "INTERNAL_OWNER" as const, isPrimary: index === 0 })),
        ...attorneyIds.map((userId, index) => ({ userId, type: "ATTORNEY" as const, isPrimary: index === 0 })),
      ];
      if (!assignments.length) throw new AppError(422, "Responsável obrigatório", "O processo deve permanecer associado a pelo menos um responsável.");
      for (const assignment of assignments) {
        const eligible = await tx.user.findFirst({ where: { tenantId: auth.tenantId, id: assignment.userId, status: "ACTIVE", OR: [{ hasAllBranches: true }, { branchAccesses: { some: { branchId: existing.branchId } } }] } });
        if (!eligible) throw forbidden("O responsável selecionado não possui acesso à filial do processo.");
      }
      await tx.caseAssignment.deleteMany({ where: { tenantId: auth.tenantId, caseId: existing.id, type: { in: ["INTERNAL_OWNER", "ATTORNEY"] } } });
      if (assignments.length) await tx.caseAssignment.createMany({ data: assignments.map((assignment) => ({ tenantId: auth.tenantId, caseId: existing.id, ...assignment })) });
      await tx.auditLog.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, entityType: "LEGAL_CASE", entityId: existing.id, action: "CASE_REASSIGNED", description: "Responsáveis do processo atualizados" } });
    }
    const action = input.status && input.status !== existing.status
      ? "CASE_STATUS_UPDATED"
      : input.processNumber && input.processNumber !== existing.processNumber
        ? "CASE_DISTRIBUTED"
        : input.lastProgress && input.lastProgress !== existing.lastProgress
          ? "CASE_PROGRESS_UPDATED"
          : "CASE_UPDATED";
    const description = action === "CASE_STATUS_UPDATED"
      ? `Status alterado de ${existing.status} para ${updated.status}`
      : action === "CASE_DISTRIBUTED"
        ? "Número do processo adicionado e distribuição registrada"
        : action === "CASE_PROGRESS_UPDATED"
          ? "Último andamento atualizado"
          : "Processo atualizado";
    await recordAudit(tx, auth, request, { module: "PROCESSOS", entityType: "LEGAL_CASE", entityId: updated.id, action, description, branchId: updated.branchId, before: existing, after: updated });
    return updated;
  });
  response.json(result);
});

casesRouter.get("/:id", requireAuth, requirePermission("case.read"), async (request, response) => {
  const auth = request.auth!;
  const branches = allowedBranches(auth);
  const item = await withTenant(auth.tenantId, (tx) => tx.legalCase.findFirst({ where: { tenantId: auth.tenantId, id: String(request.params.id), ...(branches ? { branchId: { in: branches } } : {}), ...caseAssignmentFilter(auth) }, include: { branch: true, legalArea: true, parties: { include: { client: true } }, assignments: { include: { user: { select: { id: true, name: true } } } }, deadlines: { orderBy: { dueAt: "asc" } }, documents: { orderBy: { createdAt: "desc" } }, checklists: { include: { items: { orderBy: { position: "asc" } } } }, feeContracts: { include: { installments: true } } } }));
  if (!item) throw notFound();
  if (item.deletedAt && !auth.permissions.includes("case.restore")) throw notFound();
  response.json(item);
});

casesRouter.delete("/:id", requireAuth, requirePermission("case.delete"), async (request, response) => {
  const auth = request.auth!;
  const { reason } = deletionReasonSchema.parse(request.body);
  await withTenant(auth.tenantId, async (tx) => {
    const branches = allowedBranches(auth);
    const existing = await tx.legalCase.findFirst({ where: { tenantId: auth.tenantId, id: String(request.params.id), deletedAt: null, ...(branches ? { branchId: { in: branches } } : {}), ...caseAssignmentFilter(auth) } });
    if (!existing) throw notFound();
    const deleted = await tx.legalCase.update({ where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } }, data: { deletedAt: new Date(), deletedById: auth.userId, deletionReason: reason } });
    await recordAudit(tx, auth, request, { module: "PROCESSOS", entityType: "LEGAL_CASE", entityId: deleted.id, action: "CASE_DELETED", description: `Processo ${deleted.processNumber ?? deleted.caseType} excluído logicamente`, branchId: deleted.branchId, before: existing, after: deleted, reason });
  });
  response.status(204).send();
});

casesRouter.post("/:id/restore", requireAuth, requirePermission("case.restore"), async (request, response) => {
  const auth = request.auth!;
  const { reason } = deletionReasonSchema.parse(request.body);
  const restored = await withTenant(auth.tenantId, async (tx) => {
    const branches = allowedBranches(auth);
    const existing = await tx.legalCase.findFirst({ where: { tenantId: auth.tenantId, id: String(request.params.id), deletedAt: { not: null }, ...(branches ? { branchId: { in: branches } } : {}), ...caseAssignmentFilter(auth) } });
    if (!existing) throw notFound();
    const legalCase = await tx.legalCase.update({ where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } }, data: { deletedAt: null, deletedById: null, deletionReason: null } });
    await recordAudit(tx, auth, request, { module: "PROCESSOS", entityType: "LEGAL_CASE", entityId: legalCase.id, action: "CASE_RESTORED", description: `Processo ${legalCase.processNumber ?? legalCase.caseType} restaurado`, branchId: legalCase.branchId, before: existing, after: legalCase, reason });
    return legalCase;
  });
  response.json({ id: restored.id });
});
