import type { AuthContext } from "@chronostek/auth";
import { Prisma, type TenantTransaction } from "@chronostek/database";
import type { Request } from "express";

const SENSITIVE_KEY = /password|senha|token|secret|cookie|authorization|hash|encrypted|taxid|identity/i;

type AuditActor = AuthContext & { userName?: string };

export interface AuditEventInput {
  entityType: string;
  entityId: string;
  action: string;
  description: string;
  module?: string;
  branchId?: string | null;
  before?: unknown;
  after?: unknown;
  reason?: string;
  origin?: string;
  metadata?: Record<string, unknown>;
}

function sanitize(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  const serialized = JSON.stringify(value, (key, entry: unknown) => {
    if (SENSITIVE_KEY.test(key)) return "[REDACTED]";
    if (typeof entry === "bigint") return entry.toString();
    return entry;
  });
  if (serialized === undefined) return undefined;
  return JSON.parse(serialized) as Prisma.InputJsonValue;
}

function changedFields(before: unknown, after: unknown): Prisma.InputJsonValue | undefined {
  if (!before || !after || typeof before !== "object" || typeof after !== "object") return undefined;
  const previous = before as Record<string, unknown>;
  const next = after as Record<string, unknown>;
  const ignored = new Set(["updatedAt", "createdAt", "passwordHash", "tokenHash"]);
  const fields = [...new Set([...Object.keys(previous), ...Object.keys(next)])]
    .filter((key) => !ignored.has(key) && JSON.stringify(previous[key]) !== JSON.stringify(next[key]));
  return fields.length ? fields : undefined;
}

export function requestAuditContext(request: Request) {
  return {
    correlationId: request.id === undefined ? undefined : String(request.id),
    ipAddress: request.ip,
    userAgent: request.header("user-agent")?.slice(0, 500),
    origin: "API",
  };
}

export async function recordAudit(
  tx: TenantTransaction,
  auth: AuditActor,
  request: Request | undefined,
  input: AuditEventInput,
) {
  const context = request ? requestAuditContext(request) : undefined;
  return tx.auditLog.create({
    data: {
      tenantId: auth.tenantId,
      actorUserId: auth.userId,
      actorName: auth.userName,
      actorRoles: auth.roles,
      branchId: input.branchId ?? undefined,
      module: input.module,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      description: input.description,
      beforeState: sanitize(input.before),
      afterState: sanitize(input.after),
      changedFields: changedFields(input.before, input.after),
      reason: input.reason,
      origin: input.origin ?? context?.origin,
      correlationId: context?.correlationId,
      metadata: sanitize(input.metadata),
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    },
  });
}
