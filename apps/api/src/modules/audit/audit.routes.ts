import { Prisma, withTenant } from "@chronostek/database";
import { Router } from "express";
import { z } from "zod";
import { forbidden, notFound } from "../../lib/app-error.js";
import { allowedBranches, attendanceAttorneyFilter, caseAssignmentFilter } from "../../lib/tenant.js";
import { requireAuth, requirePermission } from "../auth/auth.middleware.js";
import { recordAudit } from "../../lib/audit.js";

export const auditRouter = Router();
const entitySchema = z.object({ entityType: z.enum(["CLIENT", "ATTENDANCE", "LEGAL_CASE", "DEADLINE", "DOCUMENT", "FEE_CONTRACT", "PAYMENT_INSTALLMENT", "HEARING", "TASK", "CALENDAR_EVENT"]), entityId: z.string().uuid() });
const optionalUuid = z.string().uuid().optional().or(z.literal("").transform(() => undefined));
const optionalDate = z.coerce.date().optional().or(z.literal("").transform(() => undefined));
const auditListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(200).optional().or(z.literal("").transform(() => undefined)),
  actorUserId: optionalUuid,
  branchId: optionalUuid,
  entityId: optionalUuid,
  action: z.string().trim().max(120).optional().or(z.literal("").transform(() => undefined)),
  module: z.string().trim().max(120).optional().or(z.literal("").transform(() => undefined)),
  entityType: z.string().trim().max(120).optional().or(z.literal("").transform(() => undefined)),
  from: optionalDate,
  to: optionalDate,
});

function auditWhere(tenantId: string, query: z.infer<typeof auditListQuerySchema>): Prisma.AuditLogWhereInput {
  return {
    tenantId,
    ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
    ...(query.branchId ? { branchId: query.branchId } : {}),
    ...(query.entityId ? { entityId: query.entityId } : {}),
    ...(query.action ? { action: query.action } : {}),
    ...(query.module ? { module: query.module } : {}),
    ...(query.entityType ? { entityType: query.entityType } : {}),
    ...(query.from || query.to ? { createdAt: { gte: query.from, lte: query.to } } : {}),
    ...(query.search ? { OR: [
      { description: { contains: query.search, mode: "insensitive" } },
      { actorName: { contains: query.search, mode: "insensitive" } },
      { action: { contains: query.search, mode: "insensitive" } },
      { entityType: { contains: query.search, mode: "insensitive" } },
    ] } : {}),
  };
}

auditRouter.get("/", requireAuth, requirePermission("audit.read"), async (request, response) => {
  const auth = request.auth!;
  const query = auditListQuerySchema.parse(request.query);
  const where = auditWhere(auth.tenantId, query);
  const data = await withTenant(auth.tenantId, async (tx) => {
    const [items, total, facets] = await Promise.all([
      tx.auditLog.findMany({ where, include: { actor: { select: { name: true } } }, orderBy: { createdAt: "desc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      tx.auditLog.count({ where }),
      tx.auditLog.findMany({ where: { tenantId: auth.tenantId }, select: { action: true, module: true, entityType: true }, distinct: ["action", "module", "entityType"], take: 500 }),
    ]);
    return {
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
      facets: {
        actions: [...new Set(facets.map((item) => item.action))].sort(),
        modules: [...new Set(facets.map((item) => item.module).filter((value): value is string => Boolean(value)))].sort(),
        entityTypes: [...new Set(facets.map((item) => item.entityType))].sort(),
      },
    };
  });
  response.json(data);
});

auditRouter.get("/export.csv", requireAuth, requirePermission("audit.export"), async (request, response) => {
  const auth = request.auth!;
  const query = auditListQuerySchema.parse({ ...request.query, page: 1, pageSize: 100 });
  const items = await withTenant(auth.tenantId, (tx) => tx.auditLog.findMany({
    where: auditWhere(auth.tenantId, query),
    orderBy: { createdAt: "desc" },
    take: 10_000,
  }));
  const csvCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows = [
    ["Lexora, um produto Telun."],
    ["Data", "Usuário", "Perfis", "Módulo", "Ação", "Entidade", "ID", "Descrição", "Motivo", "Origem", "Correlation ID"],
    ...items.map((item) => [item.createdAt.toISOString(), item.actorName ?? "Sistema", item.actorRoles.join("; "), item.module, item.action, item.entityType, item.entityId, item.description, item.reason, item.origin, item.correlationId]),
  ];
  await withTenant(auth.tenantId, (tx) => recordAudit(tx, auth, request, { module: "HISTÓRICO", entityType: "AUDIT_EXPORT", entityId: auth.tenantId, action: "AUDIT_EXPORTED", description: "Histórico exportado em CSV", origin: "API" }));
  response.setHeader("content-type", "text/csv; charset=utf-8");
  response.setHeader("content-disposition", `attachment; filename="historico-lexora-${new Date().toISOString().slice(0, 10)}.csv"`);
  response.send(`\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`);
});

auditRouter.get("/entity/:entityType/:entityId", requireAuth, async (request, response) => {
  const auth = request.auth!;
  const { entityType, entityId } = entitySchema.parse(request.params);
  const branches = allowedBranches(auth);
  const requiredPermission = { CLIENT: "client.read", ATTENDANCE: "attendance.read", LEGAL_CASE: "case.read", DEADLINE: "deadline.read", DOCUMENT: "document.read", FEE_CONTRACT: "finance.read", PAYMENT_INSTALLMENT: "finance.read", HEARING: "hearing.read", TASK: "task.read", CALENDAR_EVENT: "calendar.read" }[entityType];
  if (!auth.permissions.includes(requiredPermission as never)) throw forbidden();

  const items = await withTenant(auth.tenantId, async (tx) => {
    if (entityType === "CLIENT") {
      const exists = await tx.client.findFirst({ where: { tenantId: auth.tenantId, id: entityId, ...(branches ? { primaryBranchId: { in: branches } } : {}) }, select: { id: true } });
      if (!exists) throw notFound();
    } else if (entityType === "ATTENDANCE") {
      const exists = await tx.attendance.findFirst({ where: { tenantId: auth.tenantId, id: entityId, ...(branches ? { branchId: { in: branches } } : {}), ...attendanceAttorneyFilter(auth) }, select: { id: true } });
      if (!exists) throw notFound();
    } else if (entityType === "LEGAL_CASE") {
      const exists = await tx.legalCase.findFirst({ where: { tenantId: auth.tenantId, id: entityId, ...(branches ? { branchId: { in: branches } } : {}), ...caseAssignmentFilter(auth) }, select: { id: true } });
      if (!exists) throw notFound();
    } else if (entityType === "DEADLINE") {
      const exists = await tx.deadline.findFirst({ where: { tenantId: auth.tenantId, id: entityId, ...(branches ? { branchId: { in: branches } } : {}) }, select: { id: true } }); if (!exists) throw notFound();
    } else if (entityType === "DOCUMENT") {
      const exists = await tx.document.findFirst({ where: { tenantId: auth.tenantId, id: entityId, ...(branches ? { branchId: { in: branches } } : {}) }, select: { id: true } }); if (!exists) throw notFound();
    } else if (entityType === "HEARING") {
      const exists = await tx.hearing.findFirst({ where: { tenantId: auth.tenantId, id: entityId, ...(branches ? { branchId: { in: branches } } : {}) }, select: { id: true } }); if (!exists) throw notFound();
    } else if (entityType === "TASK") {
      const exists = await tx.task.findFirst({ where: { tenantId: auth.tenantId, id: entityId, ...(branches ? { OR: [{ branchId: null }, { branchId: { in: branches } }] } : {}) }, select: { id: true } }); if (!exists) throw notFound();
    } else if (entityType === "CALENDAR_EVENT") {
      const exists = await tx.calendarEvent.findFirst({ where: { tenantId: auth.tenantId, id: entityId, ...(branches ? { OR: [{ branchId: null }, { branchId: { in: branches } }] } : {}) }, select: { id: true } }); if (!exists) throw notFound();
    } else if (entityType === "PAYMENT_INSTALLMENT") {
      const exists = await tx.paymentInstallment.findFirst({ where: { tenantId: auth.tenantId, id: entityId, contract: branches ? { branchId: { in: branches } } : undefined }, select: { id: true } }); if (!exists) throw notFound();
    } else {
      const exists = await tx.feeContract.findFirst({ where: { tenantId: auth.tenantId, id: entityId, ...(branches ? { branchId: { in: branches } } : {}) }, select: { id: true } });
      if (!exists) throw notFound();
    }
    return tx.auditLog.findMany({ where: { tenantId: auth.tenantId, entityType, entityId }, include: { actor: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 200 });
  });
  response.json({ items });
});
