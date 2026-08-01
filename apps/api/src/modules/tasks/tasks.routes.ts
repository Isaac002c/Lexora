import {
  deletionReasonSchema,
  listQuerySchema,
  taskCreateSchema,
  taskUpdateSchema,
} from "@chronostek/contracts";
import { Prisma, withTenant } from "@chronostek/database";
import { Router } from "express";
import { allowedBranches, assertBranch } from "../../lib/tenant.js";
import { forbidden, notFound } from "../../lib/app-error.js";
import {
  assertClientBranch,
  assertLegalArea,
  assertUserBranchAccess,
} from "../../lib/entity-access.js";
import { recordAudit } from "../../lib/audit.js";
import { requireAuth, requirePermission } from "../auth/auth.middleware.js";

export const tasksRouter = Router();

tasksRouter.get(
  "/",
  requireAuth,
  requirePermission("task.read"),
  async (request, response) => {
    const auth = request.auth!;
    const query = listQuerySchema.parse(request.query);
    if (
      query.deleted !== "exclude" &&
      !auth.permissions.includes("task.restore")
    )
      throw forbidden();
    const branches = allowedBranches(auth, query.branchId);
    const ownOnly =
      auth.roles.includes("ADVOGADO") &&
      !auth.roles.some(
        (role) => role === "ADMIN_GERAL" || role === "GESTOR_FILIAL",
      );
    const where: Prisma.TaskWhereInput = {
      tenantId: auth.tenantId,
      ...(query.deleted === "only"
        ? { deletedAt: { not: null } }
        : query.deleted === "exclude"
          ? { deletedAt: null }
          : {}),
      ...(branches
        ? { OR: [{ branchId: null }, { branchId: { in: branches } }] }
        : {}),
      ...(ownOnly ? { assigneeId: auth.userId } : {}),
      ...(query.responsibleId ? { assigneeId: query.responsibleId } : {}),
      ...(query.legalAreaId ? { legalAreaId: query.legalAreaId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.from || query.to
        ? { dueAt: { gte: query.from, lte: query.to } }
        : {}),
      ...(query.search
        ? { title: { contains: query.search, mode: "insensitive" } }
        : {}),
    };
    const data = await withTenant(auth.tenantId, async (tx) => {
      const [items, total] = await Promise.all([
        tx.task.findMany({
          where,
          orderBy: [{ status: "asc" }, { dueAt: "asc" }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        tx.task.count({ where }),
      ]);
      const userIds = [
        ...new Set(items.flatMap((x) => [x.assigneeId, x.requesterId])),
      ];
      const users = await tx.user.findMany({
        where: { tenantId: auth.tenantId, id: { in: userIds } },
        select: { id: true, name: true },
      });
      return {
        items: items.map((item) => ({
          ...item,
          assigneeName:
            users.find((x) => x.id === item.assigneeId)?.name ??
            "Usuário indisponível",
          requesterName:
            users.find((x) => x.id === item.requesterId)?.name ??
            "Usuário indisponível",
        })),
        total,
        page: query.page,
        pageSize: query.pageSize,
      };
    });
    response.json(data);
  },
);

tasksRouter.post(
  "/",
  requireAuth,
  requirePermission("task.create"),
  async (request, response) => {
    const auth = request.auth!;
    const input = taskCreateSchema.parse(request.body);
    if (input.branchId) assertBranch(auth, input.branchId);
    const item = await withTenant(auth.tenantId, async (tx) => {
      if (input.branchId)
        await Promise.all([
          assertUserBranchAccess(
            tx,
            auth.tenantId,
            input.assigneeId,
            input.branchId,
          ),
          assertClientBranch(tx, auth.tenantId, input.clientId, input.branchId),
        ]);
      else {
        const user = await tx.user.findFirst({
          where: {
            tenantId: auth.tenantId,
            id: input.assigneeId,
            status: "ACTIVE",
          },
          select: { id: true },
        });
        if (!user) throw notFound("Responsável não encontrado.");
      }
      await assertLegalArea(tx, auth.tenantId, input.legalAreaId);
      const task = await tx.task.create({
        data: { tenantId: auth.tenantId, requesterId: auth.userId, ...input },
      });
      if (task.assigneeId !== auth.userId)
        await tx.notification.create({
          data: {
            tenantId: auth.tenantId,
            userId: task.assigneeId,
            branchId: task.branchId,
            type: "SYSTEM",
            title: "Nova tarefa",
            message: task.title,
            entityType: "TASK",
            entityId: task.id,
          },
        });
      await recordAudit(tx, auth, request, {
        module: "TAREFAS",
        entityType: "TASK",
        entityId: task.id,
        action: "TASK_CREATED",
        description: `Tarefa ${task.title} criada`,
        branchId: task.branchId,
        after: task,
      });
      return task;
    });
    response.status(201).json({ id: item.id });
  },
);

tasksRouter.patch(
  "/:id",
  requireAuth,
  requirePermission("task.update"),
  async (request, response) => {
    const auth = request.auth!;
    const input = taskUpdateSchema.parse(request.body);
    const item = await withTenant(auth.tenantId, async (tx) => {
      const branches = allowedBranches(auth);
      const ownOnly =
        auth.roles.includes("ADVOGADO") &&
        !auth.roles.some(
          (role) => role === "ADMIN_GERAL" || role === "GESTOR_FILIAL",
        );
      const existing = await tx.task.findFirst({
        where: {
          tenantId: auth.tenantId,
          id: String(request.params.id),
          deletedAt: null,
          ...(branches
            ? { OR: [{ branchId: null }, { branchId: { in: branches } }] }
            : {}),
          ...(ownOnly ? { assigneeId: auth.userId } : {}),
        },
      });
      if (!existing) throw notFound();
      const branchId = input.branchId ?? existing.branchId ?? undefined;
      if (branchId) {
        assertBranch(auth, branchId);
        await assertUserBranchAccess(
          tx,
          auth.tenantId,
          input.assigneeId ?? existing.assigneeId,
          branchId,
        );
      }
      const task = await tx.task.update({
        where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } },
        data: {
          ...input,
          completedAt:
            input.status === "CONCLUIDA"
              ? new Date()
              : input.status
                ? null
                : undefined,
        },
      });
      await recordAudit(tx, auth, request, {
        module: "TAREFAS",
        entityType: "TASK",
        entityId: task.id,
        action:
          input.status === "CONCLUIDA"
            ? "TASK_COMPLETED"
            : existing.status === "CONCLUIDA" && input.status
              ? "TASK_REOPENED"
              : "TASK_UPDATED",
        description: `Tarefa ${task.title} atualizada`,
        branchId: task.branchId,
        before: existing,
        after: task,
      });
      return task;
    });
    response.json({ id: item.id });
  },
);

tasksRouter.delete(
  "/:id",
  requireAuth,
  requirePermission("task.delete"),
  async (request, response) => {
    const auth = request.auth!;
    const { reason } = deletionReasonSchema.parse(request.body);
    await withTenant(auth.tenantId, async (tx) => {
      const branches = allowedBranches(auth);
      const existing = await tx.task.findFirst({
        where: {
          tenantId: auth.tenantId,
          id: String(request.params.id),
          deletedAt: null,
          ...(branches
            ? { OR: [{ branchId: null }, { branchId: { in: branches } }] }
            : {}),
        },
      });
      if (!existing) throw notFound();
      const task = await tx.task.update({
        where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } },
        data: {
          deletedAt: new Date(),
          deletedById: auth.userId,
          deletionReason: reason,
        },
      });
      await recordAudit(tx, auth, request, {
        module: "TAREFAS",
        entityType: "TASK",
        entityId: task.id,
        action: "TASK_DELETED",
        description: `Tarefa ${task.title} excluída logicamente`,
        branchId: task.branchId,
        before: existing,
        after: task,
        reason,
      });
    });
    response.status(204).send();
  },
);
tasksRouter.post(
  "/:id/restore",
  requireAuth,
  requirePermission("task.restore"),
  async (request, response) => {
    const auth = request.auth!;
    const { reason } = deletionReasonSchema.parse(request.body);
    const item = await withTenant(auth.tenantId, async (tx) => {
      const branches = allowedBranches(auth);
      const existing = await tx.task.findFirst({
        where: {
          tenantId: auth.tenantId,
          id: String(request.params.id),
          deletedAt: { not: null },
          ...(branches
            ? { OR: [{ branchId: null }, { branchId: { in: branches } }] }
            : {}),
        },
      });
      if (!existing) throw notFound();
      const task = await tx.task.update({
        where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } },
        data: { deletedAt: null, deletedById: null, deletionReason: null },
      });
      await recordAudit(tx, auth, request, {
        module: "TAREFAS",
        entityType: "TASK",
        entityId: task.id,
        action: "TASK_RESTORED",
        description: `Tarefa ${task.title} restaurada`,
        branchId: task.branchId,
        before: existing,
        after: task,
        reason,
      });
      return task;
    });
    response.json({ id: item.id });
  },
);
