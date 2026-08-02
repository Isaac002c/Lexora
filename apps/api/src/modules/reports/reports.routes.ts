import type { AuthContext } from "@chronostek/auth";
import { listQuerySchema } from "@chronostek/contracts";
import { withTenant } from "@chronostek/database";
import { Router } from "express";
import { allowedBranches } from "../../lib/tenant.js";
import { requireAuth, requirePermission } from "../auth/auth.middleware.js";
import { recordAudit } from "../../lib/audit.js";

export const reportsRouter = Router();

const caseStatuses = ["EM_ANALISE", "AGUARDANDO_DOCUMENTOS", "AGUARDANDO_CONTRATO", "AGUARDANDO_PAGAMENTO", "PETICAO_INICIAL", "PRONTO_PARA_DISTRIBUICAO", "DISTRIBUIDO", "EM_ANDAMENTO", "FINALIZADO", "ARQUIVADO"] as const;

async function loadReport(auth: AuthContext, rawQuery: unknown) {
  const query = listQuerySchema.parse(rawQuery);
  const branches = allowedBranches(auth, query.branchId);
  const now = new Date();
  const from = query.from ?? new Date(now.getFullYear(), now.getMonth(), 1);
  const to = query.to ?? now;
  const branchFilter = branches ? { in: branches } : undefined;
  const selectedCaseStatus = caseStatuses.find((status) => status === query.status);
  const assignmentFilter = query.responsibleId ? { assignments: { some: { userId: query.responsibleId } } } : {};
  const caseWhere = {
    tenantId: auth.tenantId,
    deletedAt: null,
    createdAt: { gte: from, lte: to },
    ...(branchFilter ? { branchId: branchFilter } : {}),
    ...(query.legalAreaId ? { legalAreaId: query.legalAreaId } : {}),
    ...(selectedCaseStatus ? { status: selectedCaseStatus } : {}),
    ...assignmentFilter,
  };
  const clientWhere = {
    tenantId: auth.tenantId,
    deletedAt: null,
    status: "ACTIVE" as const,
    ...(branchFilter ? { primaryBranchId: branchFilter } : {}),
    ...(query.legalAreaId
      ? { caseParties: { some: { case: { legalAreaId: query.legalAreaId } } } }
      : {}),
    ...(query.responsibleId
      ? {
          OR: [
            { responsibleUserId: query.responsibleId },
            { caseParties: { some: { case: { assignments: { some: { userId: query.responsibleId } } } } } },
          ],
        }
      : {}),
  };

  return withTenant(auth.tenantId, async (tx) => {
    const [attendedClients, closedContracts, revenue, delinquent, activeCases, finalizedCases, byArea, byBranch, byAttorney, byResponsible, caseStatusBreakdown, attendanceStatusBreakdown, deadlineStatusBreakdown, financeStatusBreakdown, upcomingDeadlines, pendingDocuments, activeClients, companyClients, individualClients, approvalPending] = await Promise.all([
      tx.attendance.count({ where: { tenantId: auth.tenantId, deletedAt: null, occurredAt: { gte: from, lte: to }, ...(branchFilter ? { branchId: branchFilter } : {}), ...(query.legalAreaId ? { legalAreaId: query.legalAreaId } : {}), ...(query.responsibleId ? { attorneyId: query.responsibleId } : {}) } }),
      tx.feeContract.count({ where: { tenantId: auth.tenantId, deletedAt: null, createdAt: { gte: from, lte: to }, status: { in: ["ACTIVE", "COMPLETED"] }, ...(branchFilter ? { branchId: branchFilter } : {}) } }),
      tx.paymentInstallment.aggregate({ where: { tenantId: auth.tenantId, deletedAt: null, status: "PAID", paidAt: { gte: from, lte: to }, contract: { deletedAt: null, ...(branchFilter ? { branchId: branchFilter } : {}), ...(query.responsibleId ? { case: { assignments: { some: { userId: query.responsibleId } } } } : {}) } }, _sum: { amount: true } }),
      tx.paymentInstallment.count({ where: { tenantId: auth.tenantId, deletedAt: null, status: "PENDING", dueDate: { lt: new Date(now.getTime() - 15 * 86_400_000) }, contract: { deletedAt: null, ...(branchFilter ? { branchId: branchFilter } : {}) } } }),
      tx.legalCase.count({ where: { ...caseWhere, ...(selectedCaseStatus ? {} : { status: { notIn: ["FINALIZADO", "ARQUIVADO"] } }) } }),
      tx.legalCase.count({ where: { ...caseWhere, status: "FINALIZADO" } }),
      tx.legalCase.groupBy({ by: ["legalAreaId"], where: caseWhere, _count: true }),
      tx.legalCase.groupBy({ by: ["branchId"], where: caseWhere, _count: true }),
      tx.caseAssignment.groupBy({ by: ["userId"], where: { tenantId: auth.tenantId, type: "ATTORNEY", case: caseWhere }, _count: true }),
      tx.caseAssignment.groupBy({ by: ["userId"], where: { tenantId: auth.tenantId, type: "INTERNAL_OWNER", case: caseWhere }, _count: true }),
      tx.legalCase.groupBy({ by: ["status"], where: caseWhere, _count: true }),
      tx.attendance.groupBy({ by: ["status"], where: { tenantId: auth.tenantId, deletedAt: null, occurredAt: { gte: from, lte: to }, ...(branchFilter ? { branchId: branchFilter } : {}), ...(query.legalAreaId ? { legalAreaId: query.legalAreaId } : {}), ...(query.responsibleId ? { attorneyId: query.responsibleId } : {}) }, _count: true }),
      tx.deadline.groupBy({ by: ["status"], where: { tenantId: auth.tenantId, deletedAt: null, dueAt: { gte: from, lte: to }, ...(branchFilter ? { branchId: branchFilter } : {}), ...(query.legalAreaId ? { legalAreaId: query.legalAreaId } : {}), ...(query.responsibleId ? { responsibleUserId: query.responsibleId } : {}) }, _count: true }),
      tx.paymentInstallment.groupBy({ by: ["status"], where: { tenantId: auth.tenantId, deletedAt: null, dueDate: { gte: from, lte: to }, contract: { deletedAt: null, ...(branchFilter ? { branchId: branchFilter } : {}) } }, _count: true, _sum: { amount: true } }),
      tx.deadline.count({ where: { tenantId: auth.tenantId, deletedAt: null, status: { in: ["PENDING", "IN_PROGRESS"] }, dueAt: { gte: now, lte: new Date(now.getTime() + 7 * 86_400_000) }, ...(branchFilter ? { branchId: branchFilter } : {}), ...(query.legalAreaId ? { legalAreaId: query.legalAreaId } : {}), ...(query.responsibleId ? { responsibleUserId: query.responsibleId } : {}) } }),
      tx.document.count({ where: { tenantId: auth.tenantId, deletedAt: null, status: { in: ["PENDING", "UNDER_REVIEW"] }, ...(branchFilter ? { branchId: branchFilter } : {}), ...(query.responsibleId ? { case: { assignments: { some: { userId: query.responsibleId } } } } : {}) } }),
      tx.client.count({ where: clientWhere }),
      tx.client.count({ where: { ...clientWhere, type: "COMPANY" } }),
      tx.client.count({ where: { ...clientWhere, type: "INDIVIDUAL" } }),
      tx.deadline.count({ where: { tenantId: auth.tenantId, deletedAt: null, status: "PENDING_APPROVAL", dueAt: { gte: from, lte: to }, ...(branchFilter ? { branchId: branchFilter } : {}), ...(query.legalAreaId ? { legalAreaId: query.legalAreaId } : {}), ...(query.responsibleId ? { responsibleUserId: query.responsibleId } : {}) } }),
    ]);
    const [areas, branchRecords, attorneys] = await Promise.all([
      tx.legalArea.findMany({ where: { tenantId: auth.tenantId, id: { in: byArea.map((item) => item.legalAreaId) } }, select: { id: true, name: true } }),
      tx.branch.findMany({ where: { tenantId: auth.tenantId, id: { in: byBranch.map((item) => item.branchId) } }, select: { id: true, name: true } }),
      tx.user.findMany({ where: { tenantId: auth.tenantId, id: { in: [...new Set([...byAttorney, ...byResponsible].map((item) => item.userId))] } }, select: { id: true, name: true } }),
    ]);
    return {
      generatedAt: now,
      period: { from, to },
      attendedClients,
      closedContracts,
      revenue: revenue._sum.amount?.toFixed(2) ?? "0.00",
      delinquent,
      activeCases,
      finalizedCases,
      upcomingDeadlines,
      pendingDocuments,
      activeClients,
      companyClients,
      individualClients,
      approvalPending,
      casesByArea: byArea.map((item) => ({ name: areas.find((area) => area.id === item.legalAreaId)?.name ?? "Área removida", count: item._count })),
      casesByBranch: byBranch.map((item) => ({ name: branchRecords.find((branch) => branch.id === item.branchId)?.name ?? "Filial removida", count: item._count })),
      casesByAttorney: byAttorney.map((item) => ({ name: attorneys.find((user) => user.id === item.userId)?.name ?? "Usuário removido", count: item._count })),
      casesByResponsible: byResponsible.map((item) => ({ name: attorneys.find((user) => user.id === item.userId)?.name ?? "Usuário removido", count: item._count })),
      caseStatusBreakdown: caseStatusBreakdown.map((item) => ({ name: item.status, count: item._count })),
      attendanceStatusBreakdown: attendanceStatusBreakdown.map((item) => ({ name: item.status, count: item._count })),
      deadlineStatusBreakdown: deadlineStatusBreakdown.map((item) => ({ name: item.status, count: item._count })),
      financeStatusBreakdown: financeStatusBreakdown.map((item) => ({ name: item.status, count: item._count, amount: item._sum.amount?.toFixed(2) ?? "0.00" })),
    };
  });
}

reportsRouter.get("/summary", requireAuth, requirePermission("report.read"), async (request, response) => {
  response.json(await loadReport(request.auth!, request.query));
});

reportsRouter.get("/export.csv", requireAuth, requirePermission("report.read"), async (request, response) => {
  const auth = request.auth!;
  const data = await loadReport(auth, request.query);
  const rows: Array<Array<string | number>> = [
    ["Indicador", "Valor"],
    ["Clientes atendidos", data.attendedClients],
    ["Clientes ativos cadastrados", data.activeClients],
    ["Empresas cadastradas", data.companyClients],
    ["Pessoas físicas cadastradas", data.individualClients],
    ["Contratos fechados", data.closedContracts],
    ["Faturamento recebido", data.revenue],
    ["Inadimplentes há mais de 15 dias", data.delinquent],
    ["Processos ativos", data.activeCases],
    ["Processos finalizados", data.finalizedCases],
    ["Prazos próximos", data.upcomingDeadlines],
    ["Conclusões aguardando aprovação", data.approvalPending],
    ["Documentos pendentes", data.pendingDocuments],
    [],
    ["Processos por área", "Quantidade"],
    ...data.casesByArea.map((item) => [item.name, item.count]),
    [],
    ["Processos por filial", "Quantidade"],
    ...data.casesByBranch.map((item) => [item.name, item.count]),
    [],
    ["Processos por advogado", "Quantidade"],
    ...data.casesByAttorney.map((item) => [item.name, item.count]),
    [],
    ["Processos por responsável interno", "Quantidade"],
    ...data.casesByResponsible.map((item) => [item.name, item.count]),
  ];
  const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(";")).join("\r\n");
  await withTenant(auth.tenantId, (tx) => recordAudit(tx, auth, request, { module: "RELATÓRIOS", entityType: "REPORT", entityId: auth.tenantId, action: "REPORT_EXPORTED", description: "Relatório consolidado exportado em CSV", origin: "API" }));
  response.setHeader("content-type", "text/csv; charset=utf-8");
  response.setHeader("content-disposition", `attachment; filename="relatorio-lexora-${new Date().toISOString().slice(0, 10)}.csv"`);
  response.send(`\uFEFF${csv}`);
});
