import {
  deletionReasonSchema,
  hearingCreateSchema,
  hearingUpdateSchema,
  listQuerySchema,
} from "@chronostek/contracts";
import { Prisma, withTenant } from "@chronostek/database";
import { Router } from "express";
import { allowedBranches, assertBranch } from "../../lib/tenant.js";
import { forbidden, notFound } from "../../lib/app-error.js";
import {
  assertCaseRelations,
  assertClientBranch,
  assertLegalArea,
  assertUserBranchAccess,
} from "../../lib/entity-access.js";
import { recordAudit } from "../../lib/audit.js";
import { requireAuth, requirePermission } from "../auth/auth.middleware.js";

export const hearingsRouter = Router();

hearingsRouter.get(
  "/",
  requireAuth,
  requirePermission("hearing.read"),
  async (request, response) => {
    const auth = request.auth!;
    const query = listQuerySchema.parse(request.query);
    if (
      query.deleted !== "exclude" &&
      !auth.permissions.includes("hearing.restore")
    )
      throw forbidden();
    const branches = allowedBranches(auth, query.branchId);
    const ownOnly =
      auth.roles.includes("ADVOGADO") &&
      !auth.roles.some(
        (role) => role === "ADMIN_GERAL" || role === "GESTOR_FILIAL",
      );
    const where: Prisma.HearingWhereInput = {
      tenantId: auth.tenantId,
      ...(query.deleted === "only"
        ? { deletedAt: { not: null } }
        : query.deleted === "exclude"
          ? { deletedAt: null }
          : {}),
      ...(branches ? { branchId: { in: branches } } : {}),
      ...(query.legalAreaId ? { legalAreaId: query.legalAreaId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.from || query.to
        ? { startsAt: { gte: query.from, lte: query.to } }
        : {}),
      AND: [
        ...(ownOnly
          ? [
              {
                OR: [{ attorneyId: auth.userId }, { assistantId: auth.userId }],
              },
            ]
          : []),
        ...(query.responsibleId
          ? [
              {
                OR: [
                  { attorneyId: query.responsibleId },
                  { assistantId: query.responsibleId },
                ],
              },
            ]
          : []),
        ...(query.search
          ? [
              {
                OR: [
                  {
                    type: {
                      contains: query.search,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    location: {
                      contains: query.search,
                      mode: "insensitive" as const,
                    },
                  },
                ],
              },
            ]
          : []),
      ],
    };
    const data = await withTenant(auth.tenantId, async (tx) => {
      const [items, total] = await Promise.all([
        tx.hearing.findMany({
          where,
          orderBy: { startsAt: "asc" },
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        tx.hearing.count({ where }),
      ]);
      const clientIds = [...new Set(items.map((x) => x.clientId))];
      const caseIds = [...new Set(items.map((x) => x.caseId))];
      const userIds = [
        ...new Set(
          items
            .flatMap((x) => [x.attorneyId, x.assistantId])
            .filter((x): x is string => Boolean(x)),
        ),
      ];
      const [clients, cases, users] = await Promise.all([
        tx.client.findMany({
          where: { tenantId: auth.tenantId, id: { in: clientIds } },
          select: { id: true, name: true },
        }),
        tx.legalCase.findMany({
          where: { tenantId: auth.tenantId, id: { in: caseIds } },
          select: { id: true, processNumber: true, caseType: true },
        }),
        tx.user.findMany({
          where: { tenantId: auth.tenantId, id: { in: userIds } },
          select: { id: true, name: true },
        }),
      ]);
      return {
        items: items.map((item) => ({
          ...item,
          clientName:
            clients.find((x) => x.id === item.clientId)?.name ??
            "Cliente indisponível",
          caseLabel:
            cases.find((x) => x.id === item.caseId)?.processNumber ??
            cases.find((x) => x.id === item.caseId)?.caseType ??
            "Processo indisponível",
          attorneyName: users.find((x) => x.id === item.attorneyId)?.name,
          assistantName: users.find((x) => x.id === item.assistantId)?.name,
        })),
        total,
        page: query.page,
        pageSize: query.pageSize,
      };
    });
    response.json(data);
  },
);

hearingsRouter.post(
  "/",
  requireAuth,
  requirePermission("hearing.create"),
  async (request, response) => {
    const auth = request.auth!;
    const input = hearingCreateSchema.parse(request.body);
    assertBranch(auth, input.branchId);
    const item = await withTenant(auth.tenantId, async (tx) => {
      await Promise.all([
        assertClientBranch(tx, auth.tenantId, input.clientId, input.branchId),
        assertCaseRelations(tx, auth.tenantId, {
          caseId: input.caseId,
          branchId: input.branchId,
          clientId: input.clientId,
        }),
        assertLegalArea(tx, auth.tenantId, input.legalAreaId),
        assertUserBranchAccess(
          tx,
          auth.tenantId,
          input.attorneyId,
          input.branchId,
        ),
        assertUserBranchAccess(
          tx,
          auth.tenantId,
          input.assistantId,
          input.branchId,
        ),
      ]);
      const hearing = await tx.hearing.create({
        data: { tenantId: auth.tenantId, ...input },
      });
      const recipients = [
        ...new Set(
          [input.attorneyId, input.assistantId].filter((x): x is string =>
            Boolean(x),
          ),
        ),
      ];
      if (
        recipients.length &&
        hearing.startsAt <= new Date(Date.now() + 5 * 86_400_000)
      )
        await tx.notification.createMany({
          data: recipients.map((userId) => ({
            tenantId: auth.tenantId,
            userId,
            branchId: hearing.branchId,
            type: "SYSTEM" as const,
            title: "Audiência próxima",
            message: hearing.type,
            entityType: "HEARING",
            entityId: hearing.id,
          })),
        });
      await recordAudit(tx, auth, request, {
        module: "AUDIÊNCIAS",
        entityType: "HEARING",
        entityId: hearing.id,
        action: "HEARING_CREATED",
        description: `Audiência ${hearing.type} criada`,
        branchId: hearing.branchId,
        after: hearing,
      });
      return hearing;
    });
    response.status(201).json({ id: item.id });
  },
);

hearingsRouter.patch(
  "/:id",
  requireAuth,
  requirePermission("hearing.update"),
  async (request, response) => {
    const auth = request.auth!;
    const input = hearingUpdateSchema.parse(request.body);
    const item = await withTenant(auth.tenantId, async (tx) => {
      const branches = allowedBranches(auth);
      const existing = await tx.hearing.findFirst({
        where: {
          tenantId: auth.tenantId,
          id: String(request.params.id),
          deletedAt: null,
          ...(branches ? { branchId: { in: branches } } : {}),
        },
      });
      if (!existing) throw notFound();
      const branchId = input.branchId ?? existing.branchId;
      assertBranch(auth, branchId);
      await Promise.all([
        assertClientBranch(
          tx,
          auth.tenantId,
          input.clientId ?? existing.clientId,
          branchId,
        ),
        assertCaseRelations(tx, auth.tenantId, {
          caseId: input.caseId ?? existing.caseId,
          branchId,
          clientId: input.clientId ?? existing.clientId,
        }),
        assertUserBranchAccess(
          tx,
          auth.tenantId,
          input.attorneyId ?? existing.attorneyId ?? undefined,
          branchId,
        ),
        assertUserBranchAccess(
          tx,
          auth.tenantId,
          input.assistantId ?? existing.assistantId ?? undefined,
          branchId,
        ),
      ]);
      const hearing = await tx.hearing.update({
        where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } },
        data: input,
      });
      await recordAudit(tx, auth, request, {
        module: "AUDIÊNCIAS",
        entityType: "HEARING",
        entityId: hearing.id,
        action:
          input.startsAt &&
          input.startsAt.getTime() !== existing.startsAt.getTime()
            ? "HEARING_RESCHEDULED"
            : input.status === "CANCELADA"
              ? "HEARING_CANCELLED"
              : "HEARING_UPDATED",
        description: `Audiência ${hearing.type} atualizada`,
        branchId: hearing.branchId,
        before: existing,
        after: hearing,
      });
      return hearing;
    });
    response.json({ id: item.id });
  },
);

hearingsRouter.delete(
  "/:id",
  requireAuth,
  requirePermission("hearing.delete"),
  async (request, response) => {
    const auth = request.auth!;
    const { reason } = deletionReasonSchema.parse(request.body);
    await withTenant(auth.tenantId, async (tx) => {
      const branches = allowedBranches(auth);
      const existing = await tx.hearing.findFirst({
        where: {
          tenantId: auth.tenantId,
          id: String(request.params.id),
          deletedAt: null,
          ...(branches ? { branchId: { in: branches } } : {}),
        },
      });
      if (!existing) throw notFound();
      const item = await tx.hearing.update({
        where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } },
        data: {
          deletedAt: new Date(),
          deletedById: auth.userId,
          deletionReason: reason,
        },
      });
      await recordAudit(tx, auth, request, {
        module: "AUDIÊNCIAS",
        entityType: "HEARING",
        entityId: item.id,
        action: "HEARING_DELETED",
        description: `Audiência ${item.type} excluída logicamente`,
        branchId: item.branchId,
        before: existing,
        after: item,
        reason,
      });
    });
    response.status(204).send();
  },
);

hearingsRouter.post(
  "/:id/restore",
  requireAuth,
  requirePermission("hearing.restore"),
  async (request, response) => {
    const auth = request.auth!;
    const { reason } = deletionReasonSchema.parse(request.body);
    const item = await withTenant(auth.tenantId, async (tx) => {
      const branches = allowedBranches(auth);
      const existing = await tx.hearing.findFirst({
        where: {
          tenantId: auth.tenantId,
          id: String(request.params.id),
          deletedAt: { not: null },
          ...(branches ? { branchId: { in: branches } } : {}),
        },
      });
      if (!existing) throw notFound();
      const hearing = await tx.hearing.update({
        where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } },
        data: { deletedAt: null, deletedById: null, deletionReason: null },
      });
      await recordAudit(tx, auth, request, {
        module: "AUDIÊNCIAS",
        entityType: "HEARING",
        entityId: hearing.id,
        action: "HEARING_RESTORED",
        description: `Audiência ${hearing.type} restaurada`,
        branchId: hearing.branchId,
        before: existing,
        after: hearing,
        reason,
      });
      return hearing;
    });
    response.json({ id: item.id });
  },
);
