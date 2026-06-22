import { branchCreateSchema, branchUpdateSchema, legalAreaCreateSchema, legalAreaUpdateSchema, passwordResetSchema, tenantSettingsSchema, userCreateSchema, userUpdateSchema } from "@chronostek/contracts";
import { withTenant } from "@chronostek/database";
import argon2 from "argon2";
import { Router } from "express";
import { normalizeSearch } from "../../lib/field-crypto.js";
import { requireAuth, requirePermission } from "../auth/auth.middleware.js";
import multer from "multer";
import { saveLocalFile, removeLocalFile } from "../documents/storage.js";
import { AppError, notFound } from "../../lib/app-error.js";

export const adminRouter = Router();
const logoUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });

adminRouter.get("/overview", requireAuth, requirePermission("user.manage"), async (request, response) => {
  const auth = request.auth!;
  const data = await withTenant(auth.tenantId, async (tx) => {
    const [users, branches, legalAreas, roles] = await Promise.all([
      tx.user.findMany({ where: { tenantId: auth.tenantId, archivedAt: null }, select: { id: true, name: true, email: true, status: true, lastLoginAt: true, hasAllBranches: true, roles: { select: { role: { select: { code: true, name: true } } } }, branchAccesses: { select: { branch: { select: { id: true, name: true } } } } }, orderBy: { name: "asc" } }),
      tx.branch.findMany({ where: { tenantId: auth.tenantId }, include: { _count: { select: { userAccesses: true, clients: true, cases: true } } }, orderBy: { name: "asc" } }),
      tx.legalArea.findMany({ where: { tenantId: auth.tenantId }, include: { _count: { select: { cases: true, checklistTemplates: true } } }, orderBy: { name: "asc" } }),
      tx.role.findMany({ where: { tenantId: auth.tenantId }, select: { id: true, code: true, name: true, description: true, permissions: { select: { permission: { select: { code: true, description: true } } } } }, orderBy: { name: "asc" } }),
    ]);
    return { users, branches, legalAreas, roles };
  });
  response.json(data);
});

adminRouter.post("/branches", requireAuth, requirePermission("branch.manage"), async (request, response) => {
  const auth = request.auth!;
  const input = branchCreateSchema.parse(request.body);
  const item = await withTenant(auth.tenantId, async (tx) => {
    const branch = await tx.branch.create({ data: { tenantId: auth.tenantId, ...input } });
    await tx.auditLog.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, entityType: "BRANCH", entityId: branch.id, action: "BRANCH_CREATED", description: `Filial ${branch.name} criada` } });
    return branch;
  });
  response.status(201).json(item);
});

adminRouter.post("/legal-areas", requireAuth, requirePermission("legal_area.manage"), async (request, response) => {
  const auth = request.auth!;
  const input = legalAreaCreateSchema.parse(request.body);
  const code = normalizeSearch(input.name).toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  const item = await withTenant(auth.tenantId, async (tx) => {
    const area = await tx.legalArea.create({ data: { tenantId: auth.tenantId, code, ...input } });
    await tx.auditLog.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, entityType: "LEGAL_AREA", entityId: area.id, action: "LEGAL_AREA_CREATED", description: `Área ${area.name} criada` } });
    return area;
  });
  response.status(201).json(item);
});

adminRouter.post("/users", requireAuth, requirePermission("user.manage"), async (request, response) => {
  const auth = request.auth!;
  const input = userCreateSchema.parse(request.body);
  const item = await withTenant(auth.tenantId, async (tx) => {
    const role = await tx.role.findUniqueOrThrow({ where: { tenantId_code: { tenantId: auth.tenantId, code: input.roleCode } } });
    const user = await tx.user.create({ data: {
      tenantId: auth.tenantId, name: input.name, email: input.email, emailNormalized: input.email, passwordHash: await argon2.hash(input.temporaryPassword, { type: argon2.argon2id }),
      status: "ACTIVE", forcePasswordChange: true, hasAllBranches: input.hasAllBranches,
      roles: { create: { roleId: role.id } },
      branchAccesses: input.hasAllBranches ? undefined : { create: input.branchIds.map((branchId) => ({ branchId })) },
    } });
    await tx.auditLog.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, entityType: "USER", entityId: user.id, action: "USER_CREATED", description: `Usuário ${user.name} criado` } });
    return user;
  });
  response.status(201).json({ id: item.id });
});

adminRouter.patch("/branches/:id", requireAuth, requirePermission("branch.manage"), async (request, response) => {
  const auth = request.auth!;
  const input = branchUpdateSchema.parse(request.body);
  const branch = await withTenant(auth.tenantId, async (tx) => {
    const existing = await tx.branch.findFirst({ where: { tenantId: auth.tenantId, id: String(request.params.id) } });
    if (!existing) throw notFound();
    const updated = await tx.branch.update({ where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } }, data: input });
    await tx.auditLog.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, entityType: "BRANCH", entityId: updated.id, action: input.isActive === false ? "BRANCH_DEACTIVATED" : "BRANCH_UPDATED", description: `Filial ${updated.name} atualizada` } });
    return updated;
  });
  response.json({ id: branch.id });
});

adminRouter.patch("/legal-areas/:id", requireAuth, requirePermission("legal_area.manage"), async (request, response) => {
  const auth = request.auth!;
  const input = legalAreaUpdateSchema.parse(request.body);
  const area = await withTenant(auth.tenantId, async (tx) => {
    const existing = await tx.legalArea.findFirst({ where: { tenantId: auth.tenantId, id: String(request.params.id) } });
    if (!existing) throw notFound();
    const updated = await tx.legalArea.update({ where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } }, data: { ...input, code: input.name ? normalizeSearch(input.name).toUpperCase().replace(/[^A-Z0-9]+/g, "_") : undefined } });
    await tx.auditLog.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, entityType: "LEGAL_AREA", entityId: updated.id, action: input.isActive === false ? "LEGAL_AREA_DEACTIVATED" : "LEGAL_AREA_UPDATED", description: `Área ${updated.name} atualizada` } });
    return updated;
  });
  response.json({ id: area.id });
});

adminRouter.patch("/users/:id", requireAuth, requirePermission("user.manage"), async (request, response) => {
  const auth = request.auth!;
  const input = userUpdateSchema.parse(request.body);
  if (String(request.params.id) === auth.userId && input.status && input.status !== "ACTIVE") throw new AppError(422, "Operação inválida", "Você não pode desativar sua própria conta.");
  const user = await withTenant(auth.tenantId, async (tx) => {
    const existing = await tx.user.findFirst({ where: { tenantId: auth.tenantId, id: String(request.params.id), archivedAt: null }, include: { branchAccesses: true } });
    if (!existing) throw notFound();
    const hasAllBranches = input.hasAllBranches ?? existing.hasAllBranches;
    const branchIds = input.branchIds ?? existing.branchAccesses.map((access) => access.branchId);
    if (!hasAllBranches && branchIds.length === 0) throw new AppError(422, "Filial obrigatória", "Selecione ao menos uma filial para o usuário.");
    if (input.roleCode) {
      const role = await tx.role.findUniqueOrThrow({ where: { tenantId_code: { tenantId: auth.tenantId, code: input.roleCode } } });
      await tx.userRole.deleteMany({ where: { tenantId: auth.tenantId, userId: existing.id } });
      await tx.userRole.create({ data: { tenantId: auth.tenantId, userId: existing.id, roleId: role.id } });
    }
    if (input.branchIds || input.hasAllBranches !== undefined) {
      await tx.userBranchAccess.deleteMany({ where: { tenantId: auth.tenantId, userId: existing.id } });
      if (!hasAllBranches) await tx.userBranchAccess.createMany({ data: branchIds.map((branchId) => ({ tenantId: auth.tenantId, userId: existing.id, branchId })) });
    }
    const updated = await tx.user.update({ where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } }, data: { name: input.name, email: input.email, emailNormalized: input.email, hasAllBranches, status: input.status, archivedAt: input.status === "ARCHIVED" ? new Date() : undefined } });
    if (input.status && input.status !== "ACTIVE") await tx.session.updateMany({ where: { tenantId: auth.tenantId, userId: existing.id, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.auditLog.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, entityType: "USER", entityId: updated.id, action: "USER_UPDATED", description: `Usuário ${updated.name} atualizado` } });
    return updated;
  });
  response.json({ id: user.id });
});

adminRouter.post("/users/:id/reset-password", requireAuth, requirePermission("user.manage"), async (request, response) => {
  const auth = request.auth!;
  const input = passwordResetSchema.parse(request.body);
  await withTenant(auth.tenantId, async (tx) => {
    const existing = await tx.user.findFirst({ where: { tenantId: auth.tenantId, id: String(request.params.id), archivedAt: null } });
    if (!existing) throw notFound();
    await tx.user.update({ where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } }, data: { passwordHash: await argon2.hash(input.temporaryPassword, { type: argon2.argon2id }), forcePasswordChange: true } });
    await tx.session.updateMany({ where: { tenantId: auth.tenantId, userId: existing.id, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.auditLog.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, entityType: "USER", entityId: existing.id, action: "USER_PASSWORD_RESET", description: `Senha temporária redefinida para ${existing.name}` } });
  });
  response.json({ success: true });
});

adminRouter.get("/settings", requireAuth, requirePermission("tenant.configure"), async (request, response) => {
  const auth = request.auth!;
  const data = await withTenant(auth.tenantId, (tx) => tx.tenant.findUniqueOrThrow({ where: { id: auth.tenantId }, select: { tradeName: true, legalName: true, slug: true, timezone: true, settings: true } }));
  response.json(data);
});

adminRouter.patch("/settings", requireAuth, requirePermission("tenant.configure"), async (request, response) => {
  const auth = request.auth!;
  const input = tenantSettingsSchema.parse(request.body);
  const data = await withTenant(auth.tenantId, async (tx) => {
    const tenant = await tx.tenant.update({ where: { id: auth.tenantId }, data: { tradeName: input.tradeName } });
    await tx.tenantSettings.upsert({ where: { tenantId: auth.tenantId }, update: { contactEmail: input.contactEmail, contactPhone: input.contactPhone, website: input.website, primaryColor: input.primaryColor }, create: { tenantId: auth.tenantId, contactEmail: input.contactEmail, contactPhone: input.contactPhone, website: input.website, primaryColor: input.primaryColor } });
    await tx.auditLog.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, entityType: "TENANT", entityId: auth.tenantId, action: "TENANT_SETTINGS_UPDATED", description: "Configurações do escritório atualizadas" } });
    return tenant;
  });
  response.json(data);
});

adminRouter.post("/logo", requireAuth, requirePermission("tenant.configure"), logoUpload.single("file"), async (request, response) => {
  const auth = request.auth!;
  if (!request.file) throw new Error("Arquivo obrigatório.");
  const saved = await saveLocalFile(auth.tenantId, request.file);
  try {
    const file = await withTenant(auth.tenantId, async (tx) => {
      const stored = await tx.storedFile.create({ data: { tenantId: auth.tenantId, uploadedById: auth.userId, driver: "LOCAL", objectKey: saved.objectKey, originalName: request.file!.originalname.slice(0, 255), mimeType: request.file!.mimetype, sizeBytes: request.file!.size, checksum: saved.checksum } });
      await tx.tenantSettings.upsert({ where: { tenantId: auth.tenantId }, update: { logoFileId: stored.id }, create: { tenantId: auth.tenantId, logoFileId: stored.id } });
      await tx.auditLog.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, entityType: "TENANT", entityId: auth.tenantId, action: "TENANT_LOGO_UPDATED", description: "Logo do escritório atualizada" } });
      return stored;
    });
    response.status(201).json({ id: file.id });
  } catch (error) { await removeLocalFile(saved.absolutePath); throw error; }
});

adminRouter.get("/audit", requireAuth, requirePermission("audit.read"), async (request, response) => {
  const auth = request.auth!;
  const items = await withTenant(auth.tenantId, (tx) => tx.auditLog.findMany({ where: { tenantId: auth.tenantId }, include: { actor: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 100 }));
  response.json({ items });
});
