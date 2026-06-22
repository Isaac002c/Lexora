import type { AuthContext } from "@chronostek/auth";
import { forbidden } from "./app-error.js";

export function assertBranch(auth: AuthContext, branchId: string) {
  if (!auth.hasAllBranches && !auth.branchIds.includes(branchId)) throw forbidden("Você não possui acesso a esta filial.");
}

export function allowedBranches(auth: AuthContext, requested?: string) {
  if (requested) {
    assertBranch(auth, requested);
    return [requested];
  }
  return auth.hasAllBranches ? undefined : auth.branchIds;
}

export function caseAssignmentFilter(auth: AuthContext) {
  const restrictedAttorney = auth.roles.includes("ADVOGADO") && !auth.roles.some((role) => role === "ADMIN_GERAL" || role === "GESTOR_FILIAL");
  return restrictedAttorney ? { assignments: { some: { userId: auth.userId } } } : {};
}

export function attendanceAttorneyFilter(auth: AuthContext) {
  const restrictedAttorney = auth.roles.includes("ADVOGADO") && !auth.roles.some((role) => role === "ADMIN_GERAL" || role === "GESTOR_FILIAL");
  return restrictedAttorney ? { attorneyId: auth.userId } : {};
}

export function deadlineAttorneyFilter(auth: AuthContext) {
  const restrictedAttorney = auth.roles.includes("ADVOGADO") && !auth.roles.some((role) => role === "ADMIN_GERAL" || role === "GESTOR_FILIAL");
  return restrictedAttorney ? { OR: [{ responsibleUserId: auth.userId }, { case: { assignments: { some: { userId: auth.userId } } } }] } : {};
}

export function documentAttorneyFilter(auth: AuthContext) {
  const restrictedAttorney = auth.roles.includes("ADVOGADO") && !auth.roles.some((role) => role === "ADMIN_GERAL" || role === "GESTOR_FILIAL");
  return restrictedAttorney ? { case: { assignments: { some: { userId: auth.userId } } } } : {};
}

export function checklistAttorneyFilter(auth: AuthContext) {
  const restrictedAttorney = auth.roles.includes("ADVOGADO") && !auth.roles.some((role) => role === "ADMIN_GERAL" || role === "GESTOR_FILIAL");
  return restrictedAttorney ? { case: { assignments: { some: { userId: auth.userId } } } } : {};
}

export function clientAttorneyFilter(auth: AuthContext) {
  const restrictedAttorney = auth.roles.includes("ADVOGADO") && !auth.roles.some((role) => role === "ADMIN_GERAL" || role === "GESTOR_FILIAL");
  return restrictedAttorney ? { caseParties: { some: { case: { assignments: { some: { userId: auth.userId } } } } } } : {};
}
