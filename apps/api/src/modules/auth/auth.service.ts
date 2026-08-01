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

// Limite defensivo: evita que o login varra um número arbitrário de escritórios.
const MAX_LOGIN_TENANTS = 10;

// O usuário não escolhe o escritório: ele é resolvido pelo e-mail. `tenants` não tem
// RLS (é a tabela de descoberta), mas a busca do usuário roda SEMPRE dentro do
// contexto do tenant (`withTenant`), preservando o isolamento. Se `tenantSlug` vier
// informado, ele restringe a busca — útil para desambiguar e-mail repetido.
async function candidateTenantIds(input: LoginInput): Promise<string[]> {
  if (input.tenantSlug) {
    const tenant = await prisma.tenant.findUnique({ where: { slug: input.tenantSlug }, select: { id: true, status: true } });
    return tenant && tenant.status === "ACTIVE" ? [tenant.id] : [];
  }
  const tenants = await prisma.tenant.findMany({ where: { status: "ACTIVE" }, select: { id: true }, orderBy: { createdAt: "asc" }, take: MAX_LOGIN_TENANTS });
  return tenants.map((tenant) => tenant.id);
}

export async function login(input: LoginInput, metadata: { ip?: string; userAgent?: string; correlationId?: string }) {
  // A senha é quem desambigua: só há sucesso onde e-mail E senha conferem. Falhas
  // retornam sempre a mesma mensagem genérica (sem enumeração de usuário/escritório).
  for (const tenantId of await candidateTenantIds(input)) {
    const result = await withTenant(tenantId, async (tx) => {
      const user = await tx.user.findUnique({
        where: { tenantId_emailNormalized: { tenantId, emailNormalized: input.email } },
        select: { id: true, name: true, passwordHash: true, status: true, forcePasswordChange: true },
      });
      if (!user) return null;
      if (user.status !== "ACTIVE" || !(await argon2.verify(user.passwordHash, input.password))) {
        await tx.auditLog.create({ data: {
          tenantId,
          entityType: "USER",
          entityId: user.id,
          action: "AUTH_LOGIN_DENIED",
          description: "Tentativa de autenticação negada",
          module: "AUTH",
          origin: "API",
          correlationId: metadata.correlationId,
          ipAddress: metadata.ip,
          userAgent: metadata.userAgent?.slice(0, 500),
        } });
        return null;
      }

      const now = new Date();
      const rawToken = `${tenantId}.${randomBytes(48).toString("base64url")}`;
      const session = await tx.session.create({
        data: {
          tenantId,
          userId: user.id,
          tokenHash: tokenHash(rawToken),
          expiresAt: new Date(now.getTime() + SESSION_ABSOLUTE_MS),
          idleExpiresAt: new Date(now.getTime() + SESSION_IDLE_MS),
          ipAddress: metadata.ip,
          userAgent: metadata.userAgent?.slice(0, 500),
        },
      });
      await tx.user.update({ where: { tenantId_id: { tenantId, id: user.id } }, data: { lastLoginAt: now } });
      await tx.auditLog.create({
        data: { tenantId, actorUserId: user.id, actorName: user.name, entityType: "SESSION", entityId: session.id, action: "AUTH_LOGIN", description: "Usuário autenticado", module: "AUTH", origin: "API", correlationId: metadata.correlationId, ipAddress: metadata.ip, userAgent: metadata.userAgent?.slice(0, 500) },
      });

      return { token: rawToken, expiresAt: session.expiresAt, forcePasswordChange: user.forcePasswordChange };
    });
    if (result) return result;
  }

  throw new AppError(401, "Credenciais inválidas", "E-mail ou senha inválidos.");
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
      primaryColor: session.tenant.settings?.primaryColor ?? "#A56FFF",
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

export async function logout(rawToken: string, auth: NonNullable<Express.Request["auth"]>, metadata: { ip?: string; userAgent?: string; correlationId?: string }) {
  const tenantId = parseTenantId(rawToken);
  return withTenant(tenantId, async (tx) => {
    await tx.auditLog.create({ data: {
      tenantId,
      actorUserId: auth.userId,
      actorName: auth.userName,
      actorRoles: auth.roles,
      entityType: "SESSION",
      entityId: auth.sessionId,
      action: "AUTH_LOGOUT",
      description: "Usuário encerrou a sessão",
      module: "AUTH",
      origin: "API",
      correlationId: metadata.correlationId,
      ipAddress: metadata.ip,
      userAgent: metadata.userAgent?.slice(0, 500),
    } });
    return tx.session.updateMany({ where: { tokenHash: tokenHash(rawToken), revokedAt: null }, data: { revokedAt: new Date() } });
  });
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
