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
  "client.delete",
  "client.restore",
  "client.export",
  "client.history",
  "attendance.read",
  "attendance.create",
  "attendance.update",
  "attendance.convert",
  "attendance.delete",
  "attendance.restore",
  "attendance.export",
  "attendance.history",
  "case.read",
  "case.create",
  "case.update",
  "case.update_assigned",
  "case.delete",
  "case.restore",
  "case.export",
  "case.history",
  "deadline.read",
  "deadline.manage",
  "deadline.delete",
  "deadline.restore",
  "deadline.export",
  "deadline.history",
  "hearing.read",
  "hearing.create",
  "hearing.update",
  "hearing.delete",
  "hearing.restore",
  "hearing.export",
  "hearing.history",
  "task.read",
  "task.create",
  "task.update",
  "task.delete",
  "task.restore",
  "task.export",
  "task.history",
  "calendar.read",
  "calendar.create",
  "calendar.update",
  "calendar.delete",
  "calendar.restore",
  "document.read",
  "document.upload",
  "document.delete",
  "document.restore",
  "document.history",
  "checklist.manage",
  "finance.read",
  "finance.update",
  "finance.delete",
  "finance.restore",
  "finance.export",
  "finance.history",
  "report.read",
  "user.manage",
  "branch.manage",
  "legal_area.manage",
  "tenant.configure",
  "audit.read",
  "audit.export",
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
