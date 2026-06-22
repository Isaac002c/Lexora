import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import multer from "multer";

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
  return new AppError(404, "Recurso não encontrado", message, "https://chronostek.com.br/problems/not-found");
}

export function forbidden(message = "Você não tem permissão para esta operação") {
  return new AppError(403, "Acesso negado", message, "https://chronostek.com.br/problems/forbidden");
}

export function errorHandler(error: unknown, request: Request, response: Response, _next: NextFunction) {
  if (error instanceof multer.MulterError) {
    const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 422;
    return response.status(status).type("application/problem+json").json({
      type: "https://chronostek.com.br/problems/upload",
      title: error.code === "LIMIT_FILE_SIZE" ? "Arquivo muito grande" : "Upload inválido",
      status,
      requestId: request.id,
    });
  }
  if (error instanceof ZodError) {
    return response.status(422).type("application/problem+json").json({
      type: "https://chronostek.com.br/problems/validation",
      title: "Dados inválidos",
      status: 422,
      requestId: request.id,
      errors: error.flatten().fieldErrors,
    });
  }

  if (error instanceof AppError) {
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
    type: "https://chronostek.com.br/problems/internal-error",
    title: "Erro interno",
    status: 500,
    detail: "Não foi possível concluir a operação.",
    requestId: request.id,
  });
}
