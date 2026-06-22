import { Router } from "express";
import { listQuerySchema } from "@chronostek/contracts";
import { Prisma, withTenant } from "@chronostek/database";
import { requireAuth, requirePermission } from "../auth/auth.middleware.js";
import { allowedBranches, caseAssignmentFilter } from "../../lib/tenant.js";

export const dashboardRouter = Router();

dashboardRouter.get("/", requireAuth, requirePermission("dashboard.read"), async (request, response) => {
  const auth = request.auth!;
  const filters = listQuerySchema.parse(request.query);
  const branchIds = allowedBranches(auth, filters.branchId);
  const branchFilter = branchIds ? { in: branchIds } : undefined;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextSevenDays = new Date(now.getTime() + 7 * 86_400_000);
  const fifteenDaysAgo = new Date(now.getTime() - 15 * 86_400_000);

  const data = await withTenant(auth.tenantId, async (tx) => {
    const caseWhere: Prisma.LegalCaseWhereInput = { tenantId: auth.tenantId, ...(branchFilter ? { branchId: branchFilter } : {}), ...(filters.legalAreaId ? { legalAreaId: filters.legalAreaId } : {}), ...caseAssignmentFilter(auth) };
    const [clients, attendances, activeCases, upcomingDeadlines, pendingDocuments, openContracts, overdueInstallments, delinquentInstallments, revenue] = await Promise.all([
      tx.client.count({ where: { tenantId: auth.tenantId, status: "ACTIVE", ...(branchFilter ? { primaryBranchId: branchFilter } : {}) } }),
      tx.attendance.count({ where: { tenantId: auth.tenantId, occurredAt: { gte: monthStart }, ...(branchFilter ? { branchId: branchFilter } : {}) } }),
      tx.legalCase.count({ where: { ...caseWhere, status: { notIn: ["FINALIZADO", "ARQUIVADO"] } } }),
      tx.deadline.count({ where: { tenantId: auth.tenantId, status: { in: ["PENDING", "IN_PROGRESS"] }, dueAt: { lte: nextSevenDays }, ...(branchFilter ? { branchId: branchFilter } : {}) } }),
      tx.document.count({ where: { tenantId: auth.tenantId, status: { in: ["PENDING", "UNDER_REVIEW"] }, ...(branchFilter ? { branchId: branchFilter } : {}) } }),
      tx.feeContract.count({ where: { tenantId: auth.tenantId, status: { in: ["DRAFT", "ACTIVE"] }, ...(branchFilter ? { branchId: branchFilter } : {}) } }),
      tx.paymentInstallment.count({ where: { tenantId: auth.tenantId, status: "PENDING", dueDate: { lt: now }, contract: branchFilter ? { branchId: branchFilter } : undefined } }),
      tx.paymentInstallment.count({ where: { tenantId: auth.tenantId, status: "PENDING", dueDate: { lt: fifteenDaysAgo }, contract: branchFilter ? { branchId: branchFilter } : undefined } }),
      tx.feeContract.aggregate({ where: { tenantId: auth.tenantId, status: { in: ["ACTIVE", "COMPLETED"] }, ...(branchFilter ? { branchId: branchFilter } : {}) }, _sum: { feeAmount: true } }),
    ]);
    return { clients, attendances, activeCases, upcomingDeadlines, pendingDocuments, openContracts, overdueInstallments, delinquentInstallments, estimatedRevenue: revenue._sum.feeAmount?.toFixed(2) ?? "0.00" };
  });
  response.json(data);
});
