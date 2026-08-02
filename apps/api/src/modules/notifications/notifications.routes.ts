import { withTenant } from "@chronostek/database";
import { Router } from "express";
import { notFound } from "../../lib/app-error.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { ensureTenantOperationalNotifications } from "./notifications.service.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", requireAuth, async (request, response) => {
  const auth = request.auth!;
  await ensureTenantOperationalNotifications(auth.tenantId);
  const data = await withTenant(auth.tenantId, async (tx) => {
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
