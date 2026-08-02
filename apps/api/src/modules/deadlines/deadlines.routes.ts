import {
  deadlineCreateSchema,
  deadlineInternalState,
  deadlineReviewSchema,
  deadlineStatusSchema,
  deadlineUpdateSchema,
  deletionReasonSchema,
  internalDueAt,
  listQuerySchema,
  optionalEnum,
} from "@chronostek/contracts";
import { Prisma, withTenant } from "@chronostek/database";
import { Router } from "express";
import { z } from "zod";
import { deadlineColor } from "../../lib/deadline.js";
import { allowedBranches, assertBranch, deadlineAttorneyFilter } from "../../lib/tenant.js";
import { forbidden, notFound } from "../../lib/app-error.js";
import { assertCaseRelations, assertLegalArea, assertUserBranchAccess } from "../../lib/entity-access.js";
import { recordAudit } from "../../lib/audit.js";
import { requireAuth, requirePermission } from "../auth/auth.middleware.js";
import { notifyDeadlineReviewers } from "../notifications/notifications.service.js";

export const deadlinesRouter = Router();
// Filtros opcionais toleram string vazia (sem filtro) — endurecido no backend.
export const deadlineQuerySchema = listQuerySchema.extend({ view: optionalEnum(["overdue", "today", "next5", "next7", "distant", "completed"]), type: optionalEnum(["PETICAO_INICIAL", "AUDIENCIA", "RECURSO", "MANIFESTACAO", "ADMINISTRATIVO", "OUTRO"]) });

deadlinesRouter.get(
  "/",
  requireAuth,
  requirePermission("deadline.read"),
  async (request, response) => {
    const auth = request.auth!;
    const query = deadlineQuerySchema.parse(request.query);
    if (query.deleted !== "exclude" && !auth.permissions.includes("deadline.restore")) throw forbidden();
    const branches = allowedBranches(auth, query.branchId);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(todayStart.getTime() + 86_400_000);
    const viewDueAt: Prisma.DateTimeFilter | undefined = query.view === "overdue" ? { lt: now } : query.view === "today" ? { gte: todayStart, lt: tomorrow } : query.view === "next5" ? { gte: now, lte: new Date(now.getTime() + 5 * 86_400_000) } : query.view === "next7" ? { gte: now, lte: new Date(now.getTime() + 7 * 86_400_000) } : query.view === "distant" ? { gt: new Date(now.getTime() + 7 * 86_400_000) } : undefined;
    const where: Prisma.DeadlineWhereInput = {
      tenantId: auth.tenantId,
      ...(query.deleted === "only" ? { deletedAt: { not: null } } : query.deleted === "exclude" ? { deletedAt: null } : {}),
      ...(branches ? { branchId: { in: branches } } : {}),
      ...deadlineAttorneyFilter(auth),
      ...(query.legalAreaId ? { legalAreaId: query.legalAreaId } : {}),
      ...(query.responsibleId
        ? { responsibleUserId: query.responsibleId }
        : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.view === "completed" ? { status: "COMPLETED" } : query.view ? { status: { in: ["PENDING", "IN_PROGRESS", "PENDING_APPROVAL"] } } : query.status ? { status: query.status as never } : {}),
      ...(viewDueAt ? { dueAt: viewDueAt } : query.from || query.to
        ? { dueAt: { gte: query.from, lte: query.to } }
        : {}),
      ...(query.search
        ? { title: { contains: query.search, mode: "insensitive" } }
        : {}),
    };
    const data = await withTenant(auth.tenantId, async (tx) => {
      const [items, total] = await Promise.all([
        tx.deadline.findMany({
          where,
          include: {
            branch: { select: { name: true } },
            client: { select: { name: true } },
            case: { select: { processNumber: true, caseType: true } },
            responsibleUser: { select: { name: true } },
            legalArea: { select: { name: true } },
          },
          orderBy: { dueAt: "asc" },
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        tx.deadline.count({ where }),
      ]);
      return {
        items: items.map((item) => ({
          ...item,
          color: deadlineColor(item.dueAt, item.status),
          internalDueAt: internalDueAt(item.dueAt),
          internalState: deadlineInternalState(item.dueAt, item.status, now, item.completedAt),
        })),
        total,
        page: query.page,
        pageSize: query.pageSize,
      };
    });
    response.json(data);
  },
);

deadlinesRouter.post(
  "/",
  requireAuth,
  requirePermission("deadline.manage"),
  async (request, response) => {
    const auth = request.auth!;
    const input = deadlineCreateSchema.parse(request.body);
    assertBranch(auth, input.branchId);
    const item = await withTenant(auth.tenantId, async (tx) => {
      await Promise.all([
        assertLegalArea(tx, auth.tenantId, input.legalAreaId),
        assertUserBranchAccess(tx, auth.tenantId, input.responsibleUserId, input.branchId),
        assertCaseRelations(tx, auth.tenantId, input),
      ]);
      const deadline = await tx.deadline.create({
        data: { tenantId: auth.tenantId, ...input },
      });
      await recordAudit(tx, auth, request, { module: "PRAZOS", entityType: "DEADLINE", entityId: deadline.id, action: "DEADLINE_CREATED", description: `Prazo ${deadline.title} criado`, branchId: deadline.branchId, after: deadline });
      return deadline;
    });
    response.status(201).json({ id: item.id });
  },
);

deadlinesRouter.patch("/:id", requireAuth, requirePermission("deadline.manage"), async (request, response) => {
  const auth = request.auth!;
  const input = deadlineUpdateSchema.parse(request.body);
  if (input.status === "COMPLETED" || input.status === "PENDING_APPROVAL") throw forbidden("Use o fluxo de envio e revisão para concluir o prazo.");
  const result = await withTenant(auth.tenantId, async (tx) => {
    const existing = await tx.deadline.findFirst({ where: { tenantId: auth.tenantId, id: String(request.params.id), deletedAt: null, ...deadlineAttorneyFilter(auth) } });
    if (!existing) throw notFound();
    assertBranch(auth, existing.branchId);
    if (input.branchId) assertBranch(auth, input.branchId);
    const relations = {
      branchId: input.branchId ?? existing.branchId,
      caseId: input.caseId ?? existing.caseId,
      clientId: input.clientId ?? existing.clientId,
      legalAreaId: input.legalAreaId ?? existing.legalAreaId,
    };
    await Promise.all([
      assertLegalArea(tx, auth.tenantId, relations.legalAreaId),
      assertUserBranchAccess(tx, auth.tenantId, input.responsibleUserId ?? existing.responsibleUserId, relations.branchId),
      assertCaseRelations(tx, auth.tenantId, relations),
    ]);
    const updated = await tx.deadline.update({ where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } }, data: { ...input, completedAt: input.status ? null : undefined, ...(existing.status === "PENDING_APPROVAL" ? { status: "IN_PROGRESS", submittedForApprovalAt: null, reviewedAt: null, reviewedById: null, reviewNotes: null } : {}) } });
    await recordAudit(tx, auth, request, { module: "PRAZOS", entityType: "DEADLINE", entityId: updated.id, action: "DEADLINE_UPDATED", description: `Prazo ${updated.title} atualizado`, branchId: updated.branchId, before: existing, after: updated });
    return updated;
  });
  response.json(result);
});

deadlinesRouter.patch(
  "/:id/status",
  requireAuth,
  requirePermission("deadline.manage"),
  async (request, response) => {
    const auth = request.auth!;
    const input = deadlineStatusSchema.parse(request.body);
    const result = await withTenant(auth.tenantId, async (tx) => {
      const existing = await tx.deadline.findFirst({
        where: { tenantId: auth.tenantId, id: String(request.params.id), deletedAt: null, ...deadlineAttorneyFilter(auth) },
      });
      if (!existing) throw notFound();
      assertBranch(auth, existing.branchId);
      if (input.status === "COMPLETED" || input.status === "PENDING_APPROVAL") throw forbidden("Use o fluxo de envio e revisão para concluir o prazo.");
      if (existing.status === "COMPLETED" && !auth.permissions.includes("deadline.approve")) throw forbidden("Somente um gestor pode reabrir um prazo aprovado.");
      const deadline = await tx.deadline.update({
        where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } },
        data: {
          status: input.status,
          completedAt: null,
        },
      });
      const description = `Prazo "${existing.title}" alterado para ${input.status}`;
      await recordAudit(tx, auth, request, { module: "PRAZOS", entityType: "DEADLINE", entityId: deadline.id, action: existing.status === "COMPLETED" ? "DEADLINE_REOPENED" : "DEADLINE_STATUS_UPDATED", description, branchId: deadline.branchId, before: existing, after: deadline });
      await tx.auditLog.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, entityType: "LEGAL_CASE", entityId: existing.caseId, action: "DEADLINE_STATUS_UPDATED", description } });
      return deadline;
    });
    response.json(result);
  },
);

deadlinesRouter.post("/:id/submit-approval", requireAuth, requirePermission("deadline.manage"), async (request, response) => {
  const auth = request.auth!;
  const result = await withTenant(auth.tenantId, async (tx) => {
    const existing = await tx.deadline.findFirst({ where: { tenantId: auth.tenantId, id: String(request.params.id), deletedAt: null, ...deadlineAttorneyFilter(auth) } });
    if (!existing) throw notFound();
    assertBranch(auth, existing.branchId);
    if (!["PENDING", "IN_PROGRESS"].includes(existing.status)) throw forbidden("Este prazo não está disponível para envio à aprovação.");
    const deadline = await tx.deadline.update({
      where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } },
      data: { status: "PENDING_APPROVAL", submittedForApprovalAt: new Date(), reviewedAt: null, reviewedById: null, reviewNotes: null },
    });
    await notifyDeadlineReviewers(tx, deadline);
    await recordAudit(tx, auth, request, { module: "PRAZOS", entityType: "DEADLINE", entityId: deadline.id, action: "DEADLINE_SUBMITTED_FOR_APPROVAL", description: `Prazo "${deadline.title}" enviado para aprovação`, branchId: deadline.branchId, before: existing, after: deadline });
    return deadline;
  });
  response.json(result);
});

deadlinesRouter.post("/:id/review", requireAuth, requirePermission("deadline.approve"), async (request, response) => {
  const auth = request.auth!;
  const input = deadlineReviewSchema.parse(request.body);
  const result = await withTenant(auth.tenantId, async (tx) => {
    const branches = allowedBranches(auth);
    const existing = await tx.deadline.findFirst({ where: { tenantId: auth.tenantId, id: String(request.params.id), deletedAt: null, status: "PENDING_APPROVAL", ...(branches ? { branchId: { in: branches } } : {}) } });
    if (!existing) throw notFound("Prazo não encontrado ou não está aguardando aprovação.");
    const approved = input.action === "APPROVE";
    const deadline = await tx.deadline.update({
      where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } },
      data: { status: approved ? "COMPLETED" : "IN_PROGRESS", completedAt: approved ? new Date() : null, reviewedAt: new Date(), reviewedById: auth.userId, reviewNotes: input.notes },
    });
    const description = approved ? `Prazo "${deadline.title}" aprovado e concluído` : `Prazo "${deadline.title}" devolvido para ajustes: ${input.notes}`;
    await recordAudit(tx, auth, request, { module: "PRAZOS", entityType: "DEADLINE", entityId: deadline.id, action: approved ? "DEADLINE_APPROVED" : "DEADLINE_RETURNED", description, branchId: deadline.branchId, before: existing, after: deadline });
    await tx.auditLog.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, entityType: "LEGAL_CASE", entityId: deadline.caseId, action: approved ? "DEADLINE_APPROVED" : "DEADLINE_RETURNED", description } });
    return deadline;
  });
  response.json(result);
});

deadlinesRouter.delete("/:id", requireAuth, requirePermission("deadline.delete"), async (request, response) => {
  const auth = request.auth!;
  const { reason } = deletionReasonSchema.parse(request.body);
  await withTenant(auth.tenantId, async (tx) => {
    const branches = allowedBranches(auth);
    const existing = await tx.deadline.findFirst({ where: { tenantId: auth.tenantId, id: String(request.params.id), deletedAt: null, ...(branches ? { branchId: { in: branches } } : {}), ...deadlineAttorneyFilter(auth) } });
    if (!existing) throw notFound();
    const deleted = await tx.deadline.update({ where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } }, data: { deletedAt: new Date(), deletedById: auth.userId, deletionReason: reason } });
    await recordAudit(tx, auth, request, { module: "PRAZOS", entityType: "DEADLINE", entityId: deleted.id, action: "DEADLINE_DELETED", description: `Prazo ${deleted.title} excluído logicamente`, branchId: deleted.branchId, before: existing, after: deleted, reason });
  });
  response.status(204).send();
});

deadlinesRouter.post("/:id/restore", requireAuth, requirePermission("deadline.restore"), async (request, response) => {
  const auth = request.auth!;
  const { reason } = deletionReasonSchema.parse(request.body);
  const restored = await withTenant(auth.tenantId, async (tx) => {
    const branches = allowedBranches(auth);
    const existing = await tx.deadline.findFirst({ where: { tenantId: auth.tenantId, id: String(request.params.id), deletedAt: { not: null }, ...(branches ? { branchId: { in: branches } } : {}), ...deadlineAttorneyFilter(auth) } });
    if (!existing) throw notFound();
    const deadline = await tx.deadline.update({ where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } }, data: { deletedAt: null, deletedById: null, deletionReason: null } });
    await recordAudit(tx, auth, request, { module: "PRAZOS", entityType: "DEADLINE", entityId: deadline.id, action: "DEADLINE_RESTORED", description: `Prazo ${deadline.title} restaurado`, branchId: deadline.branchId, before: existing, after: deadline, reason });
    return deadline;
  });
  response.json({ id: restored.id });
});
