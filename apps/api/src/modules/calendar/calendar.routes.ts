import {
  calendarEventCreateSchema,
  calendarEventUpdateSchema,
  deletionReasonSchema,
  listQuerySchema,
} from "@chronostek/contracts";
import { Prisma, withTenant } from "@chronostek/database";
import { Router } from "express";
import {
  allowedBranches,
  assertBranch,
  deadlineAttorneyFilter,
} from "../../lib/tenant.js";
import { notFound } from "../../lib/app-error.js";
import {
  assertClientBranch,
  assertLegalArea,
  assertUserBranchAccess,
} from "../../lib/entity-access.js";
import { recordAudit } from "../../lib/audit.js";
import { requireAuth, requirePermission } from "../auth/auth.middleware.js";

export const calendarRouter = Router();

calendarRouter.get(
  "/",
  requireAuth,
  requirePermission("calendar.read"),
  async (request, response) => {
    const auth = request.auth!;
    const query = listQuerySchema.parse(request.query);
    const branches = allowedBranches(auth, query.branchId);
    const from = query.from ?? new Date(Date.now() - 31 * 86_400_000);
    const to = query.to ?? new Date(Date.now() + 62 * 86_400_000);
    const ownOnly =
      auth.roles.includes("ADVOGADO") &&
      !auth.roles.some(
        (role) => role === "ADMIN_GERAL" || role === "GESTOR_FILIAL",
      );
    const data = await withTenant(auth.tenantId, async (tx) => {
      const [events, deadlines, hearings, tasks] = await Promise.all([
        tx.calendarEvent.findMany({
          where: {
            tenantId: auth.tenantId,
            deletedAt: null,
            startsAt: { gte: from, lte: to },
            ...(branches
              ? { OR: [{ branchId: null }, { branchId: { in: branches } }] }
              : {}),
            ...(query.legalAreaId ? { legalAreaId: query.legalAreaId } : {}),
            ...(query.responsibleId
              ? { ownerUserId: query.responsibleId }
              : {}),
          },
          orderBy: { startsAt: "asc" },
        }),
        auth.permissions.includes("deadline.read")
          ? tx.deadline.findMany({
              where: {
                tenantId: auth.tenantId,
                deletedAt: null,
                dueAt: { gte: from, lte: to },
                ...(branches ? { branchId: { in: branches } } : {}),
                ...deadlineAttorneyFilter(auth),
                ...(query.legalAreaId
                  ? { legalAreaId: query.legalAreaId }
                  : {}),
                ...(query.responsibleId
                  ? { responsibleUserId: query.responsibleId }
                  : {}),
              },
              select: {
                id: true,
                title: true,
                dueAt: true,
                branchId: true,
                caseId: true,
                responsibleUserId: true,
                priority: true,
                status: true,
              },
            })
          : [],
        auth.permissions.includes("hearing.read")
          ? tx.hearing.findMany({
              where: {
                tenantId: auth.tenantId,
                deletedAt: null,
                startsAt: { gte: from, lte: to },
                ...(branches ? { branchId: { in: branches } } : {}),
                ...(ownOnly
                  ? {
                      OR: [
                        { attorneyId: auth.userId },
                        { assistantId: auth.userId },
                      ],
                    }
                  : {}),
                ...(query.legalAreaId
                  ? { legalAreaId: query.legalAreaId }
                  : {}),
              },
              select: {
                id: true,
                type: true,
                startsAt: true,
                hasTime: true,
                branchId: true,
                caseId: true,
                attorneyId: true,
                location: true,
                status: true,
              },
            })
          : [],
        auth.permissions.includes("task.read")
          ? tx.task.findMany({
              where: {
                tenantId: auth.tenantId,
                deletedAt: null,
                dueAt: { gte: from, lte: to },
                ...(branches
                  ? { OR: [{ branchId: null }, { branchId: { in: branches } }] }
                  : {}),
                ...(ownOnly ? { assigneeId: auth.userId } : {}),
                ...(query.responsibleId
                  ? { assigneeId: query.responsibleId }
                  : {}),
              },
              select: {
                id: true,
                title: true,
                dueAt: true,
                branchId: true,
                caseId: true,
                assigneeId: true,
                priority: true,
                status: true,
              },
            })
          : [],
      ]);
      return {
        items: [
          ...events.map((x) => ({
            id: x.id,
            source: "EVENT",
            type: x.type,
            title: x.title,
            startsAt: x.startsAt,
            endsAt: x.endsAt,
            allDay: x.allDay,
            status: x.status,
            href: `/calendario?event=${x.id}`,
          })),
          ...deadlines.map((x) => ({
            id: x.id,
            source: "DEADLINE",
            type: "PRAZO",
            title: x.title,
            startsAt: x.dueAt,
            allDay: false,
            status: x.status,
            priority: x.priority,
            href: `/prazos?search=${encodeURIComponent(x.title)}`,
          })),
          ...hearings.map((x) => ({
            id: x.id,
            source: "HEARING",
            type: "AUDIENCIA",
            title: x.type,
            startsAt: x.startsAt,
            allDay: !x.hasTime,
            status: x.status,
            location: x.location,
            href: `/audiencias?search=${encodeURIComponent(x.type)}`,
          })),
          ...tasks.map((x) => ({
            id: x.id,
            source: "TASK",
            type: "TAREFA",
            title: x.title,
            startsAt: x.dueAt!,
            allDay: false,
            status: x.status,
            priority: x.priority,
            href: `/tarefas?search=${encodeURIComponent(x.title)}`,
          })),
        ].sort(
          (a, b) =>
            new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
        ),
      };
    });
    response.json(data);
  },
);

calendarRouter.post(
  "/",
  requireAuth,
  requirePermission("calendar.create"),
  async (request, response) => {
    const auth = request.auth!;
    const input = calendarEventCreateSchema.parse(request.body);
    if (input.branchId) assertBranch(auth, input.branchId);
    const item = await withTenant(auth.tenantId, async (tx) => {
      if (input.branchId)
        await Promise.all([
          assertUserBranchAccess(
            tx,
            auth.tenantId,
            input.ownerUserId,
            input.branchId,
          ),
          assertClientBranch(tx, auth.tenantId, input.clientId, input.branchId),
        ]);
      await assertLegalArea(tx, auth.tenantId, input.legalAreaId);
      const event = await tx.calendarEvent.create({
        data: {
          tenantId: auth.tenantId,
          ...input,
          recurrence: input.recurrence as Prisma.InputJsonValue | undefined,
        },
      });
      await recordAudit(tx, auth, request, {
        module: "CALENDÁRIO",
        entityType: "CALENDAR_EVENT",
        entityId: event.id,
        action: "EVENT_CREATED",
        description: `Evento ${event.title} criado`,
        branchId: event.branchId,
        after: event,
      });
      return event;
    });
    response.status(201).json({ id: item.id });
  },
);
calendarRouter.patch(
  "/:id",
  requireAuth,
  requirePermission("calendar.update"),
  async (request, response) => {
    const auth = request.auth!;
    const input = calendarEventUpdateSchema.parse(request.body);
    const item = await withTenant(auth.tenantId, async (tx) => {
      const branches = allowedBranches(auth);
      const existing = await tx.calendarEvent.findFirst({
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
      const event = await tx.calendarEvent.update({
        where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } },
        data: {
          ...input,
          recurrence: input.recurrence as Prisma.InputJsonValue | undefined,
        },
      });
      await recordAudit(tx, auth, request, {
        module: "CALENDÁRIO",
        entityType: "CALENDAR_EVENT",
        entityId: event.id,
        action:
          input.status === "CANCELADO" ? "EVENT_CANCELLED" : "EVENT_UPDATED",
        description: `Evento ${event.title} atualizado`,
        branchId: event.branchId,
        before: existing,
        after: event,
      });
      return event;
    });
    response.json({ id: item.id });
  },
);
calendarRouter.delete(
  "/:id",
  requireAuth,
  requirePermission("calendar.delete"),
  async (request, response) => {
    const auth = request.auth!;
    const { reason } = deletionReasonSchema.parse(request.body);
    await withTenant(auth.tenantId, async (tx) => {
      const branches = allowedBranches(auth);
      const existing = await tx.calendarEvent.findFirst({
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
      const event = await tx.calendarEvent.update({
        where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } },
        data: {
          deletedAt: new Date(),
          deletedById: auth.userId,
          deletionReason: reason,
        },
      });
      await recordAudit(tx, auth, request, {
        module: "CALENDÁRIO",
        entityType: "CALENDAR_EVENT",
        entityId: event.id,
        action: "EVENT_DELETED",
        description: `Evento ${event.title} excluído logicamente`,
        branchId: event.branchId,
        before: existing,
        after: event,
        reason,
      });
    });
    response.status(204).send();
  },
);
calendarRouter.post(
  "/:id/restore",
  requireAuth,
  requirePermission("calendar.restore"),
  async (request, response) => {
    const auth = request.auth!;
    const { reason } = deletionReasonSchema.parse(request.body);
    const item = await withTenant(auth.tenantId, async (tx) => {
      const branches = allowedBranches(auth);
      const existing = await tx.calendarEvent.findFirst({
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
      const event = await tx.calendarEvent.update({
        where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } },
        data: { deletedAt: null, deletedById: null, deletionReason: null },
      });
      await recordAudit(tx, auth, request, {
        module: "CALENDÁRIO",
        entityType: "CALENDAR_EVENT",
        entityId: event.id,
        action: "EVENT_RESTORED",
        description: `Evento ${event.title} restaurado`,
        branchId: event.branchId,
        before: existing,
        after: event,
        reason,
      });
      return event;
    });
    response.json({ id: item.id });
  },
);
