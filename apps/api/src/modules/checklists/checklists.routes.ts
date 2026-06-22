import { withTenant } from "@chronostek/database";
import { Router } from "express";
import { z } from "zod";
import { notFound } from "../../lib/app-error.js";
import { allowedBranches, checklistAttorneyFilter } from "../../lib/tenant.js";
import { requireAuth, requirePermission } from "../auth/auth.middleware.js";

export const checklistsRouter = Router();
const templateSchema = z.object({ name: z.string().trim().min(2).max(160), legalAreaId: z.string().uuid(), caseType: z.string().trim().max(160).optional(), isActive: z.boolean().default(true), items: z.array(z.object({ title: z.string().trim().min(2).max(200), description: z.string().trim().max(1000).optional(), isRequired: z.boolean().default(true) })).min(1).max(100) });

checklistsRouter.get(
  "/templates",
  requireAuth,
  requirePermission("document.read"),
  async (request, response) => {
    const auth = request.auth!;
    const templates = await withTenant(auth.tenantId, (tx) =>
      tx.checklistTemplate.findMany({
        where: { tenantId: auth.tenantId, ...(request.query.all === "true" ? {} : { isActive: true }) },
        include: {
          legalArea: { select: { name: true } },
          items: { orderBy: { position: "asc" } },
        },
        orderBy: { name: "asc" },
      }),
    );
    response.json({ items: templates });
  },
);

checklistsRouter.post("/templates", requireAuth, requirePermission("checklist.manage"), async (request, response) => {
  const auth = request.auth!;
  const input = templateSchema.parse(request.body);
  const template = await withTenant(auth.tenantId, async (tx) => {
    const item = await tx.checklistTemplate.create({ data: { tenantId: auth.tenantId, name: input.name, legalAreaId: input.legalAreaId, caseType: input.caseType, isActive: input.isActive, items: { create: input.items.map((entry, position) => ({ tenantId: auth.tenantId, ...entry, position })) } } });
    await tx.auditLog.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, entityType: "CHECKLIST_TEMPLATE", entityId: item.id, action: "CHECKLIST_TEMPLATE_CREATED", description: `Modelo ${item.name} criado` } });
    return item;
  });
  response.status(201).json({ id: template.id });
});

checklistsRouter.patch("/templates/:id", requireAuth, requirePermission("checklist.manage"), async (request, response) => {
  const auth = request.auth!;
  const input = templateSchema.partial().parse(request.body);
  const template = await withTenant(auth.tenantId, async (tx) => {
    const existing = await tx.checklistTemplate.findFirst({ where: { tenantId: auth.tenantId, id: String(request.params.id) } });
    if (!existing) throw notFound();
    const updated = await tx.checklistTemplate.update({ where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } }, data: { name: input.name, legalAreaId: input.legalAreaId, caseType: input.caseType, isActive: input.isActive } });
    if (input.items) { await tx.checklistTemplateItem.deleteMany({ where: { tenantId: auth.tenantId, templateId: existing.id } }); await tx.checklistTemplateItem.createMany({ data: input.items.map((entry, position) => ({ tenantId: auth.tenantId, templateId: existing.id, ...entry, position })) }); }
    await tx.auditLog.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, entityType: "CHECKLIST_TEMPLATE", entityId: updated.id, action: "CHECKLIST_TEMPLATE_UPDATED", description: `Modelo ${updated.name} atualizado` } });
    return updated;
  });
  response.json({ id: template.id });
});

checklistsRouter.get(
  "/cases",
  requireAuth,
  requirePermission("document.read"),
  async (request, response) => {
    const auth = request.auth!;
    const branches = allowedBranches(auth);
    const attorneyFilter = checklistAttorneyFilter(auth);
    const items = await withTenant(auth.tenantId, (tx) =>
      tx.caseChecklist.findMany({
        where: { tenantId: auth.tenantId, case: { ...(branches ? { branchId: { in: branches } } : {}), ...("case" in attorneyFilter ? attorneyFilter.case : {}) } },
        include: {
          case: {
            select: {
              caseType: true,
              id: true,
              branchId: true,
              processNumber: true,
              parties: {
                where: { isPrimary: true },
                select: { client: { select: { name: true } } },
              },
            },
          },
          items: { orderBy: { position: "asc" } },
        },
        orderBy: { updatedAt: "desc" },
        take: 100,
      }),
    );
    response.json({ items });
  },
);

checklistsRouter.post(
  "/cases",
  requireAuth,
  requirePermission("checklist.manage"),
  async (request, response) => {
    const auth = request.auth!;
    const input = z
      .object({ caseId: z.string().uuid(), templateId: z.string().uuid() })
      .parse(request.body);
    const checklist = await withTenant(auth.tenantId, async (tx) => {
      const template = await tx.checklistTemplate.findFirst({
        where: { tenantId: auth.tenantId, id: input.templateId },
        include: { items: true },
      });
      if (!template) throw notFound();
      const branches = allowedBranches(auth);
      const attorneyFilter = checklistAttorneyFilter(auth);
      const legalCase = await tx.legalCase.findFirst({ where: { tenantId: auth.tenantId, id: input.caseId, ...(branches ? { branchId: { in: branches } } : {}), ...("case" in attorneyFilter ? attorneyFilter.case : {}) } });
      if (!legalCase) throw notFound();
      const item = await tx.caseChecklist.create({
        data: {
          tenantId: auth.tenantId,
          caseId: input.caseId,
          templateId: template.id,
          name: template.name,
          items: {
            create: template.items.map((entry) => ({
              tenantId: auth.tenantId,
              title: entry.title,
              description: entry.description,
              isRequired: entry.isRequired,
              position: entry.position,
            })),
          },
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId: auth.tenantId,
          actorUserId: auth.userId,
          entityType: "CASE_CHECKLIST",
          entityId: item.id,
          action: "CHECKLIST_CREATED",
          description: `Checklist ${item.name} criado`,
        },
      });
      await tx.auditLog.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, entityType: "LEGAL_CASE", entityId: input.caseId, action: "CHECKLIST_CREATED", description: `Checklist ${item.name} aplicado` } });
      return item;
    });
    response.status(201).json({ id: checklist.id });
  },
);

checklistsRouter.patch(
  "/items/:id",
  requireAuth,
  requirePermission("checklist.manage"),
  async (request, response) => {
    const auth = request.auth!;
    const input = z
      .object({
        status: z.enum([
          "PENDENTE",
          "RECEBIDO",
          "ANALISADO",
          "RECUSADO",
          "NAO_SE_APLICA",
        ]),
        notes: z.string().max(5000).optional(),
      })
      .parse(request.body);
    const item = await withTenant(auth.tenantId, async (tx) => {
      const branches = allowedBranches(auth);
      const attorneyFilter = checklistAttorneyFilter(auth);
      const existing = await tx.checklistItem.findFirst({
        where: { tenantId: auth.tenantId, id: String(request.params.id), checklist: { case: { ...(branches ? { branchId: { in: branches } } : {}), ...("case" in attorneyFilter ? attorneyFilter.case : {}) } } }, include: { checklist: { select: { caseId: true } } },
      });
      if (!existing) throw notFound();
      const updated = await tx.checklistItem.update({
        where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } },
        data: {
          ...input,
          updatedById: auth.userId,
          receivedAt:
            input.status === "RECEBIDO" ? new Date() : existing.receivedAt,
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId: auth.tenantId,
          actorUserId: auth.userId,
          entityType: "CHECKLIST_ITEM",
          entityId: updated.id,
          action: "CHECKLIST_UPDATED",
          description: `Item ${updated.title} atualizado para ${updated.status}`,
        },
      });
      await tx.auditLog.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, entityType: "LEGAL_CASE", entityId: existing.checklist.caseId, action: "CHECKLIST_UPDATED", description: `Item ${updated.title} atualizado para ${updated.status}` } });
      return updated;
    });
    response.json(item);
  },
);
