import type { NextFunction, Request, Response } from "express";
import type { PermissionCode } from "@chronostek/auth";
import { AppError, forbidden } from "../../lib/app-error.js";
import { resolveSession } from "./auth.service.js";

export async function requireAuth(request: Request, _response: Response, next: NextFunction) {
  const header = request.header("authorization");
  if (!header?.startsWith("Bearer ")) return next(new AppError(401, "Autenticação necessária"));
  const token = header.slice(7);
  request.auth = await resolveSession(token);
  request.sessionToken = token;
  next();
}

export function requirePermission(permission: PermissionCode) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!request.auth?.permissions.includes(permission)) return next(forbidden());
    next();
  };
}

export function assertBranchAccess(request: Request, branchId: string) {
  if (!request.auth) throw new AppError(401, "Autenticação necessária");
  if (!request.auth.hasAllBranches && !request.auth.branchIds.includes(branchId)) throw forbidden("Você não possui acesso a esta filial.");
}
