import { Router } from "express";
import { withTenant } from "@chronostek/database";
import { requireAuth } from "../auth/auth.middleware.js";
import { allowedBranches, caseAssignmentFilter, clientAttorneyFilter } from "../../lib/tenant.js";

export const lookupsRouter = Router();

lookupsRouter.get("/", requireAuth, async (request, response) => {
  const auth = request.auth!;
  const branchIds = allowedBranches(auth);
  const data = await withTenant(auth.tenantId, async (tx) => {
    const [branches, legalAreas, users, clients, cases] = await Promise.all([
      tx.branch.findMany({ where: { tenantId: auth.tenantId, isActive: true, ...(branchIds ? { id: { in: branchIds } } : {}) }, select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
      tx.legalArea.findMany({ where: { tenantId: auth.tenantId, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
      tx.user.findMany({ where: { tenantId: auth.tenantId, status: "ACTIVE", ...(branchIds ? { OR: [{ hasAllBranches: true }, { branchAccesses: { some: { branchId: { in: branchIds } } } }] } : {}) }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
      tx.client.findMany({ where: { tenantId: auth.tenantId, status: "ACTIVE", ...(branchIds ? { primaryBranchId: { in: branchIds } } : {}), ...clientAttorneyFilter(auth) }, select: { id: true, name: true, primaryBranchId: true }, orderBy: { name: "asc" }, take: 500 }),
      tx.legalCase.findMany({ where: { tenantId: auth.tenantId, ...(branchIds ? { branchId: { in: branchIds } } : {}), ...caseAssignmentFilter(auth) }, select: { id: true, caseType: true, processNumber: true, parties: { where: { isPrimary: true }, select: { client: { select: { name: true } } } } }, orderBy: { createdAt: "desc" }, take: 500 }),
    ]);
    return { branches, legalAreas, users, clients, cases: cases.map((item) => ({ id: item.id, name: item.processNumber ?? `${item.caseType} — ${item.parties[0]?.client.name ?? "Sem cliente"}` })) };
  });
  response.json(data);
});
