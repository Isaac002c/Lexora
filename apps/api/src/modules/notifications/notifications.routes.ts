import { withTenant } from "@chronostek/database";
import { Router } from "express";
import { allowedBranches, deadlineAttorneyFilter } from "../../lib/tenant.js";
import { notFound } from "../../lib/app-error.js";
import { requireAuth } from "../auth/auth.middleware.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", requireAuth, async (request, response) => {
  const auth = request.auth!;
  const data = await withTenant(auth.tenantId, async (tx) => {
    if (auth.permissions.includes("deadline.read")) {
      const branches = allowedBranches(auth);
      const now = new Date();
      const soon = new Date(now.getTime() + 5 * 86_400_000);
      const deadlines = await tx.deadline.findMany({
        where: {
          tenantId: auth.tenantId,
          deletedAt: null,
          status: { in: ["PENDING", "IN_PROGRESS"] },
          dueAt: { lte: soon },
          ...(branches ? { branchId: { in: branches } } : {}),
          ...deadlineAttorneyFilter(auth),
        },
        select: { id: true, branchId: true, title: true, dueAt: true },
        take: 100,
      });
      const existing = await tx.notification.findMany({
        where: {
          tenantId: auth.tenantId,
          userId: auth.userId,
          entityType: "DEADLINE",
          entityId: { in: deadlines.map((item) => item.id) },
        },
        select: { entityId: true },
      });
      const known = new Set(existing.map((item) => item.entityId));
      const missing = deadlines.filter((item) => !known.has(item.id));
      if (missing.length) {
        await tx.notification.createMany({
          data: missing.map((item) => ({
            tenantId: auth.tenantId,
            userId: auth.userId,
            branchId: item.branchId,
            type: "DEADLINE" as const,
            title: item.dueAt < now ? "Prazo vencido" : "Prazo próximo",
            message: item.title,
            entityType: "DEADLINE",
            entityId: item.id,
          })),
        });
      }
    }
    if (auth.permissions.includes("hearing.read")) {
      const branches = allowedBranches(auth);
      const now = new Date();
      const hearings = await tx.hearing.findMany({
        where: {
          tenantId: auth.tenantId,
          deletedAt: null,
          status: { in: ["AGENDADA", "REAGENDADA"] },
          startsAt: { gte: now, lte: new Date(now.getTime() + 5 * 86_400_000) },
          ...(branches ? { branchId: { in: branches } } : {}),
          OR: [{ attorneyId: auth.userId }, { assistantId: auth.userId }],
        },
        select: { id: true, branchId: true, type: true },
        take: 100,
      });
      const existing = await tx.notification.findMany({
        where: {
          tenantId: auth.tenantId,
          userId: auth.userId,
          entityType: "HEARING",
          entityId: { in: hearings.map((item) => item.id) },
        },
        select: { entityId: true },
      });
      const known = new Set(existing.map((item) => item.entityId));
      const missing = hearings.filter((item) => !known.has(item.id));
      if (missing.length)
        await tx.notification.createMany({
          data: missing.map((item) => ({
            tenantId: auth.tenantId,
            userId: auth.userId,
            branchId: item.branchId,
            type: "SYSTEM" as const,
            title: "Audiência em até cinco dias",
            message: item.type,
            entityType: "HEARING",
            entityId: item.id,
          })),
        });
    }
    const [items, unread] = await Promise.all([
      tx.notification.findMany({
        where: { tenantId: auth.tenantId, userId: auth.userId },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      tx.notification.count({
        where: { tenantId: auth.tenantId, userId: auth.userId, readAt: null },
      }),
    ]);
    return { items, unread };
  });
  response.json(data);
});

notificationsRouter.patch(
  "/:id/read",
  requireAuth,
  async (request, response) => {
    const auth = request.auth!;
    const item = await withTenant(auth.tenantId, async (tx) => {
      const existing = await tx.notification.findFirst({
        where: {
          tenantId: auth.tenantId,
          id: String(request.params.id),
          userId: auth.userId,
        },
      });
      if (!existing) throw notFound();
      return tx.notification.update({
        where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } },
        data: { readAt: existing.readAt ?? new Date() },
      });
    });
    response.json({ id: item.id });
  },
);

notificationsRouter.post(
  "/read-all",
  requireAuth,
  async (request, response) => {
    const auth = request.auth!;
    await withTenant(auth.tenantId, (tx) =>
      tx.notification.updateMany({
        where: { tenantId: auth.tenantId, userId: auth.userId, readAt: null },
        data: { readAt: new Date() },
      }),
    );
    response.status(204).send();
  },
);
