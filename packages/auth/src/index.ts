export const roles = [
  "ADMIN_GERAL",
  "GESTOR_FILIAL",
  "SECRETARIA",
  "ADVOGADO",
  "FINANCEIRO",
  "VISUALIZADOR",
] as const;

export type RoleCode = (typeof roles)[number];

export const permissions = [
  "dashboard.read",
  "client.read",
  "client.create",
  "client.update",
  "attendance.read",
  "attendance.create",
  "attendance.update",
  "attendance.convert",
  "case.read",
  "case.create",
  "case.update",
  "case.update_assigned",
  "deadline.read",
  "deadline.manage",
  "document.read",
  "document.upload",
  "checklist.manage",
  "finance.read",
  "finance.update",
  "report.read",
  "user.manage",
  "branch.manage",
  "legal_area.manage",
  "tenant.configure",
  "audit.read",
] as const;

export type PermissionCode = (typeof permissions)[number];

export interface AuthContext {
  userId: string;
  tenantId: string;
  roles: RoleCode[];
  permissions: PermissionCode[];
  hasAllBranches: boolean;
  branchIds: string[];
}
