import {
  deadlineCreateSchema,
  deadlineStatusSchema,
  deadlineUpdateSchema,
  listQuerySchema,
  optionalEnum,
} from "@chronostek/contracts";
import { Prisma, withTenant } from "@chronostek/database";
import { Router } from "express";
import { z } from "zod";
import { deadlineColor } from "../../lib/deadline.js";
import { allowedBranches, assertBranch, deadlineAttorneyFilter } from "../../lib/tenant.js";
import { notFound } from "../../lib/app-error.js";
import { assertCaseRelations, assertLegalArea, assertUserBranchAccess } from "../../lib/entity-access.js";
import { requireAuth, requirePermission } from "../auth/auth.middleware.js";

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
    const branches = allowedBranches(auth, query.branchId);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(todayStart.getTime() + 86_400_000);
    const viewDueAt: Prisma.DateTimeFilter | undefined = query.view === "overdue" ? { lt: now } : query.view === "today" ? { gte: todayStart, lt: tomorrow } : query.view === "next5" ? { gte: now, lte: new Date(now.getTime() + 5 * 86_400_000) } : query.view === "next7" ? { gte: now, lte: new Date(now.getTime() + 7 * 86_400_000) } : query.view === "distant" ? { gt: new Date(now.getTime() + 7 * 86_400_000) } : undefined;
    const where: Prisma.DeadlineWhereInput = {
      tenantId: auth.tenantId,
      ...(branches ? { branchId: { in: branches } } : {}),
      ...deadlineAttorneyFilter(auth),
      ...(query.legalAreaId ? { legalAreaId: query.legalAreaId } : {}),
      ...(query.responsibleId
        ? { responsibleUserId: query.responsibleId }
        : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.view === "completed" ? { status: "COMPLETED" } : query.view ? { status: { in: ["PENDING", "IN_PROGRESS"] } } : query.status ? { status: query.status as never } : {}),
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
      await tx.auditLog.create({
        data: {
          tenantId: auth.tenantId,
          actorUserId: auth.userId,
          entityType: "DEADLINE",
          entityId: deadline.id,
          action: "DEADLINE_CREATED",
          description: `Prazo ${deadline.title} criado`,
        },
      });
      return deadline;
    });
    response.status(201).json({ id: item.id });
  },
);

deadlinesRouter.patch("/:id", requireAuth, requirePermission("deadline.manage"), async (request, response) => {
  const auth = request.auth!;
  const input = deadlineUpdateSchema.parse(request.body);
  const result = await withTenant(auth.tenantId, async (tx) => {
    const existing = await tx.deadline.findFirst({ where: { tenantId: auth.tenantId, id: String(request.params.id), ...deadlineAttorneyFilter(auth) } });
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
    const updated = await tx.deadline.update({ where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } }, data: { ...input, completedAt: input.status === "COMPLETED" ? new Date() : input.status ? null : undefined } });
    await tx.auditLog.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, entityType: "DEADLINE", entityId: updated.id, action: "DEADLINE_UPDATED", description: `Prazo ${updated.title} atualizado` } });
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
        where: { tenantId: auth.tenantId, id: String(request.params.id), ...deadlineAttorneyFilter(auth) },
      });
      if (!existing) throw notFound();
      assertBranch(auth, existing.branchId);
      const deadline = await tx.deadline.update({
        where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } },
        data: {
          status: input.status,
          completedAt: input.status === "COMPLETED" ? new Date() : null,
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId: auth.tenantId,
          actorUserId: auth.userId,
          entityType: "DEADLINE",
          entityId: deadline.id,
          action: "DEADLINE_STATUS_UPDATED",
          description: `Prazo alterado para ${input.status}`,
        },
      });
      return deadline;
    });
    response.json(result);
  },
);
