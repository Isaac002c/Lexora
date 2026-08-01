import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import multer from "multer";
import { withTenant } from "@chronostek/database";
import { requestAuditContext } from "./audit.js";

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly title: string,
    message?: string,
    public readonly type = "about:blank",
  ) {
    super(message ?? title);
  }
}

export function notFound(message = "Recurso não encontrado") {
  return new AppError(404, "Recurso não encontrado", message, "https://lexora.chronostek.com.br/problems/not-found");
}

export function forbidden(message = "Você não tem permissão para esta operação") {
  return new AppError(403, "Acesso negado", message, "https://lexora.chronostek.com.br/problems/forbidden");
}

export async function errorHandler(error: unknown, request: Request, response: Response, _next: NextFunction) {
  if (error instanceof multer.MulterError) {
    const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 422;
    return response.status(status).type("application/problem+json").json({
      type: "https://lexora.chronostek.com.br/problems/upload",
      title: error.code === "LIMIT_FILE_SIZE" ? "Arquivo muito grande" : "Upload inválido",
      status,
      requestId: request.id,
    });
  }
  if (error instanceof ZodError) {
    return response.status(422).type("application/problem+json").json({
      type: "https://lexora.chronostek.com.br/problems/validation",
      title: "Dados inválidos",
      status: 422,
      requestId: request.id,
      errors: error.flatten().fieldErrors,
    });
  }

  if (error instanceof AppError) {
    if (error.status === 403 && request.auth) {
      const auth = request.auth;
      const context = requestAuditContext(request);
      try {
        await withTenant(auth.tenantId, (tx) => tx.auditLog.create({
          data: {
            tenantId: auth.tenantId,
            actorUserId: auth.userId,
            actorName: auth.userName,
            actorRoles: auth.roles,
            module: request.baseUrl.split("/").filter(Boolean).at(-1)?.toUpperCase() ?? "SECURITY",
            entityType: "USER",
            entityId: auth.userId,
            action: "ACCESS_DENIED",
            description: "Tentativa de acesso sem permissão",
            origin: context.origin,
            correlationId: context.correlationId,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            metadata: { method: request.method, path: request.originalUrl.split("?")[0] },
          },
        }));
      } catch (auditError) {
        request.log.error({ err: auditError }, "Failed to record denied access audit event");
      }
    }
    return response.status(error.status).type("application/problem+json").json({
      type: error.type,
      title: error.title,
      status: error.status,
      detail: error.message,
      requestId: request.id,
    });
  }

  request.log.error({ err: error }, "Unhandled request error");
  return response.status(500).type("application/problem+json").json({
    type: "https://lexora.chronostek.com.br/problems/internal-error",
    title: "Erro interno",
    status: 500,
    detail: "Não foi possível concluir a operação.",
    requestId: request.id,
  });
}
