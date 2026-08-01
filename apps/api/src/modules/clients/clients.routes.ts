import { clientCreateSchema, clientUpdateSchema, deletionReasonSchema, listQuerySchema } from "@chronostek/contracts";
import { Prisma, withTenant } from "@chronostek/database";
import { Router } from "express";
import { normalizeSearch, normalizeTaxId, encryptField, taxIdHash } from "../../lib/field-crypto.js";
import { allowedBranches, assertBranch } from "../../lib/tenant.js";
import { forbidden, notFound } from "../../lib/app-error.js";
import { assertUserBranchAccess } from "../../lib/entity-access.js";
import { recordAudit } from "../../lib/audit.js";
import { requireAuth, requirePermission } from "../auth/auth.middleware.js";

export const clientsRouter = Router();

clientsRouter.get("/", requireAuth, requirePermission("client.read"), async (request, response) => {
  const auth = request.auth!;
  const query = listQuerySchema.parse(request.query);
  if (query.deleted !== "exclude" && !auth.permissions.includes("client.restore")) throw forbidden();
  const branches = allowedBranches(auth, query.branchId);
  const where: Prisma.ClientWhereInput = {
    tenantId: auth.tenantId,
    ...(query.deleted === "only" ? { deletedAt: { not: null } } : query.deleted === "exclude" ? { deletedAt: null } : {}),
    ...(branches ? { primaryBranchId: { in: branches } } : {}),
    ...(query.status ? { status: query.status as Prisma.EnumClientStatusFilter } : {}),
  };
  if (query.search) {
    const numeric = normalizeTaxId(query.search);
    where.OR = [
      { searchName: { contains: normalizeSearch(query.search) } },
      { email: { contains: query.search, mode: "insensitive" } },
      ...(numeric.length >= 11 ? [{ taxIdHash: taxIdHash(auth.tenantId, numeric) }] : []),
    ];
  }
  const result = await withTenant(auth.tenantId, async (tx) => {
    const [items, total] = await Promise.all([
      tx.client.findMany({ where, include: { primaryBranch: { select: { name: true } }, responsibleUser: { select: { name: true } }, _count: { select: { attendances: true, caseParties: true, documents: true } } }, orderBy: { createdAt: "desc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      tx.client.count({ where }),
    ]);
    return { items: items.map(({ taxIdEncrypted: _tax, identityEncrypted: _identity, ...item }) => item), total, page: query.page, pageSize: query.pageSize };
  });
  response.json(result);
});

clientsRouter.post("/", requireAuth, requirePermission("client.create"), async (request, response) => {
  const auth = request.auth!;
  const input = clientCreateSchema.parse(request.body);
  assertBranch(auth, input.primaryBranchId);
  const created = await withTenant(auth.tenantId, async (tx) => {
    await assertUserBranchAccess(tx, auth.tenantId, input.responsibleUserId, input.primaryBranchId);
    const tax = input.taxId ? normalizeTaxId(input.taxId) : undefined;
    const client = await tx.client.create({ data: {
      tenantId: auth.tenantId, primaryBranchId: input.primaryBranchId, responsibleUserId: input.responsibleUserId,
      type: input.type, name: input.name, searchName: normalizeSearch(input.name), email: input.email, phone: input.phone,
      taxIdEncrypted: tax ? encryptField(tax) : undefined, taxIdHash: tax ? taxIdHash(auth.tenantId, tax) : undefined,
      taxIdLast4: tax?.slice(-4), identityEncrypted: input.identity ? encryptField(input.identity) : undefined,
      birthDate: input.birthDate, address: input.address, notes: input.notes,
    } });
    await recordAudit(tx, auth, request, { module: "CLIENTES", entityType: "CLIENT", entityId: client.id, action: "CLIENT_CREATED", description: `Cliente ${client.name} criado`, branchId: client.primaryBranchId, after: client });
    return client;
  });
  response.status(201).json({ id: created.id });
});

clientsRouter.patch("/:id", requireAuth, requirePermission("client.update"), async (request, response) => {
  const auth = request.auth!;
  const input = clientUpdateSchema.parse(request.body);
  const updated = await withTenant(auth.tenantId, async (tx) => {
    const branches = allowedBranches(auth);
    const existing = await tx.client.findFirst({ where: { tenantId: auth.tenantId, id: String(request.params.id), deletedAt: null, ...(branches ? { primaryBranchId: { in: branches } } : {}) } });
    if (!existing) throw notFound();
    if (input.primaryBranchId) assertBranch(auth, input.primaryBranchId);
    const targetBranchId = input.primaryBranchId ?? existing.primaryBranchId;
    await assertUserBranchAccess(tx, auth.tenantId, input.responsibleUserId, targetBranchId);
    const tax = input.taxId ? normalizeTaxId(input.taxId) : undefined;
    const client = await tx.client.update({
      where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } },
      data: {
        primaryBranchId: input.primaryBranchId,
        responsibleUserId: input.responsibleUserId,
        type: input.type,
        name: input.name,
        searchName: input.name ? normalizeSearch(input.name) : undefined,
        email: input.email,
        phone: input.phone,
        taxIdEncrypted: tax ? encryptField(tax) : undefined,
        taxIdHash: tax ? taxIdHash(auth.tenantId, tax) : undefined,
        taxIdLast4: tax?.slice(-4),
        identityEncrypted: input.identity ? encryptField(input.identity) : undefined,
        birthDate: input.birthDate,
        address: input.address,
        notes: input.notes,
        status: input.status,
        archivedAt: input.status === "ARCHIVED" ? new Date() : input.status ? null : undefined,
      },
    });
    const restored = existing.status === "ARCHIVED" && input.status === "ACTIVE";
    await recordAudit(tx, auth, request, {
      module: "CLIENTES",
      entityType: "CLIENT",
      entityId: client.id,
      action: input.status === "ARCHIVED" ? "CLIENT_ARCHIVED" : restored ? "CLIENT_RESTORED" : "CLIENT_UPDATED",
      description: input.status === "ARCHIVED" ? `Cliente ${client.name} arquivado` : restored ? `Cliente ${client.name} restaurado` : `Cliente ${client.name} atualizado`,
      branchId: client.primaryBranchId,
      before: existing,
      after: client,
    });
    return client;
  });
  response.json({ id: updated.id });
});

clientsRouter.get("/:id", requireAuth, requirePermission("client.read"), async (request, response) => {
  const auth = request.auth!;
  const branches = allowedBranches(auth);
  const client = await withTenant(auth.tenantId, (tx) => tx.client.findFirst({
    where: { tenantId: auth.tenantId, id: String(request.params.id), ...(branches ? { primaryBranchId: { in: branches } } : {}) },
    include: { primaryBranch: true, responsibleUser: { select: { id: true, name: true } }, attendances: { orderBy: { occurredAt: "desc" }, take: 10 }, caseParties: { include: { case: { include: { legalArea: true } } }, take: 20 }, documents: { orderBy: { createdAt: "desc" }, take: 20 }, feeContracts: { include: { installments: true }, take: 20 } },
  }));
  if (!client) throw notFound();
  if (client.deletedAt && !auth.permissions.includes("client.restore")) throw notFound();
  const { taxIdEncrypted: _tax, identityEncrypted: _identity, ...safeClient } = client;
  response.json(safeClient);
});

clientsRouter.delete("/:id", requireAuth, requirePermission("client.delete"), async (request, response) => {
  const auth = request.auth!;
  const { reason } = deletionReasonSchema.parse(request.body);
  await withTenant(auth.tenantId, async (tx) => {
    const branches = allowedBranches(auth);
    const existing = await tx.client.findFirst({ where: { tenantId: auth.tenantId, id: String(request.params.id), deletedAt: null, ...(branches ? { primaryBranchId: { in: branches } } : {}) } });
    if (!existing) throw notFound();
    const deleted = await tx.client.update({
      where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } },
      data: { deletedAt: new Date(), deletedById: auth.userId, deletionReason: reason },
    });
    await recordAudit(tx, auth, request, { module: "CLIENTES", entityType: "CLIENT", entityId: deleted.id, action: "CLIENT_DELETED", description: `Cliente ${deleted.name} excluído logicamente`, branchId: deleted.primaryBranchId, before: existing, after: deleted, reason });
  });
  response.status(204).send();
});

clientsRouter.post("/:id/restore", requireAuth, requirePermission("client.restore"), async (request, response) => {
  const auth = request.auth!;
  const { reason } = deletionReasonSchema.parse(request.body);
  const restored = await withTenant(auth.tenantId, async (tx) => {
    const branches = allowedBranches(auth);
    const existing = await tx.client.findFirst({ where: { tenantId: auth.tenantId, id: String(request.params.id), deletedAt: { not: null }, ...(branches ? { primaryBranchId: { in: branches } } : {}) } });
    if (!existing) throw notFound();
    const client = await tx.client.update({
      where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } },
      data: { deletedAt: null, deletedById: null, deletionReason: null },
    });
    await recordAudit(tx, auth, request, { module: "CLIENTES", entityType: "CLIENT", entityId: client.id, action: "CLIENT_RESTORED", description: `Cliente ${client.name} restaurado`, branchId: client.primaryBranchId, before: existing, after: client, reason });
    return client;
  });
  response.json({ id: restored.id });
});
