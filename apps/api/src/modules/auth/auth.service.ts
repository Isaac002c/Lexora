import { permissions as knownPermissions, roles as knownRoles, type AuthContext, type PermissionCode, type RoleCode } from "@chronostek/auth";
import type { ChangePasswordInput, LoginInput } from "@chronostek/contracts";
import { prisma, withTenant } from "@chronostek/database";
import argon2 from "argon2";
import { createHash, randomBytes } from "node:crypto";
import { AppError } from "../../lib/app-error.js";

const SESSION_ABSOLUTE_MS = 12 * 60 * 60 * 1000;
const SESSION_IDLE_MS = 2 * 60 * 60 * 1000;

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function parseTenantId(token: string) {
  const tenantId = token.split(".", 1)[0];
  if (!tenantId || !/^[0-9a-f-]{36}$/i.test(tenantId)) throw new AppError(401, "Sessão inválida");
  return tenantId;
}

function isRoleCode(value: string): value is RoleCode {
  return (knownRoles as readonly string[]).includes(value);
}

function isPermissionCode(value: string): value is PermissionCode {
  return (knownPermissions as readonly string[]).includes(value);
}

export async function login(input: LoginInput, metadata: { ip?: string; userAgent?: string }) {
  const tenant = await prisma.tenant.findUnique({ where: { slug: input.tenantSlug }, select: { id: true, tradeName: true, status: true } });
  if (!tenant || tenant.status !== "ACTIVE") throw new AppError(401, "Credenciais inválidas", "Escritório, e-mail ou senha inválidos.");

  return withTenant(tenant.id, async (tx) => {
    const user = await tx.user.findUnique({
      where: { tenantId_emailNormalized: { tenantId: tenant.id, emailNormalized: input.email } },
      select: { id: true, name: true, email: true, passwordHash: true, status: true, forcePasswordChange: true },
    });
    if (!user || user.status !== "ACTIVE" || !(await argon2.verify(user.passwordHash, input.password))) {
      throw new AppError(401, "Credenciais inválidas", "Escritório, e-mail ou senha inválidos.");
    }

    const now = new Date();
    const rawToken = `${tenant.id}.${randomBytes(48).toString("base64url")}`;
    const session = await tx.session.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        tokenHash: tokenHash(rawToken),
        expiresAt: new Date(now.getTime() + SESSION_ABSOLUTE_MS),
        idleExpiresAt: new Date(now.getTime() + SESSION_IDLE_MS),
        ipAddress: metadata.ip,
        userAgent: metadata.userAgent?.slice(0, 500),
      },
    });
    await tx.user.update({ where: { tenantId_id: { tenantId: tenant.id, id: user.id } }, data: { lastLoginAt: now } });
    await tx.auditLog.create({
      data: { tenantId: tenant.id, actorUserId: user.id, entityType: "SESSION", entityId: session.id, action: "AUTH_LOGIN", description: "Usuário autenticado", ipAddress: metadata.ip, userAgent: metadata.userAgent?.slice(0, 500) },
    });

    return { token: rawToken, expiresAt: session.expiresAt, forcePasswordChange: user.forcePasswordChange };
  });
}

export async function resolveSession(rawToken: string) {
  const tenantId = parseTenantId(rawToken);
  const now = new Date();
  const hash = tokenHash(rawToken);
  return withTenant(tenantId, async (tx) => {
    const session = await tx.session.findUnique({
      where: { tokenHash: hash },
      include: {
        tenant: { select: { tradeName: true, status: true, settings: { select: { primaryColor: true } } } },
        user: {
          include: {
            roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
            branchAccesses: { select: { branchId: true } },
          },
        },
      },
    });
    if (!session || session.revokedAt || session.expiresAt <= now || session.idleExpiresAt <= now || session.user.status !== "ACTIVE" || session.tenant.status !== "ACTIVE") {
      throw new AppError(401, "Sessão expirada", "Entre novamente para continuar.");
    }

    if (now.getTime() - session.lastSeenAt.getTime() > 15 * 60 * 1000) {
      await tx.session.update({
        where: { id: session.id },
        data: { lastSeenAt: now, idleExpiresAt: new Date(Math.min(now.getTime() + SESSION_IDLE_MS, session.expiresAt.getTime())) },
      });
    }

    const roleCodes = session.user.roles.map(({ role }) => role.code).filter(isRoleCode);
    const permissionCodes = new Set<PermissionCode>();
    for (const { role } of session.user.roles) {
      for (const { permission } of role.permissions) if (isPermissionCode(permission.code)) permissionCodes.add(permission.code);
    }

    const auth: AuthContext & {
      sessionId: string; tenantName: string; primaryColor: string; userName: string; userEmail: string; forcePasswordChange: boolean;
    } = {
      sessionId: session.id,
      tenantId,
      tenantName: session.tenant.tradeName,
      primaryColor: session.tenant.settings?.primaryColor ?? "#06B6D4",
      userId: session.user.id,
      userName: session.user.name,
      userEmail: session.user.email,
      forcePasswordChange: session.user.forcePasswordChange,
      roles: roleCodes,
      permissions: [...permissionCodes],
      hasAllBranches: session.user.hasAllBranches,
      branchIds: session.user.branchAccesses.map(({ branchId }) => branchId),
    };
    return auth;
  });
}

export async function logout(rawToken: string) {
  const tenantId = parseTenantId(rawToken);
  return withTenant(tenantId, (tx) => tx.session.updateMany({ where: { tokenHash: tokenHash(rawToken), revokedAt: null }, data: { revokedAt: new Date() } }));
}

export async function changePassword(rawToken: string, auth: NonNullable<Express.Request["auth"]>, input: ChangePasswordInput) {
  return withTenant(auth.tenantId, async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { tenantId_id: { tenantId: auth.tenantId, id: auth.userId } } });
    if (!(await argon2.verify(user.passwordHash, input.currentPassword))) throw new AppError(422, "Senha atual incorreta");
    if (await argon2.verify(user.passwordHash, input.newPassword)) throw new AppError(422, "Senha inválida", "A nova senha deve ser diferente da atual.");

    const passwordHash = await argon2.hash(input.newPassword, { type: argon2.argon2id });
    await tx.user.update({ where: { tenantId_id: { tenantId: auth.tenantId, id: auth.userId } }, data: { passwordHash, forcePasswordChange: false } });
    await tx.session.updateMany({ where: { tenantId: auth.tenantId, userId: auth.userId, id: { not: auth.sessionId }, revokedAt: null }, data: { revokedAt: new Date() } });
    await tx.auditLog.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, entityType: "USER", entityId: auth.userId, action: "PASSWORD_CHANGED", description: "Senha alterada pelo usuário" } });
    return { success: true, currentToken: tokenHash(rawToken) };
  });
}
