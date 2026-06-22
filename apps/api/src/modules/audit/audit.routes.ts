import { withTenant } from "@chronostek/database";
import { Router } from "express";
import { z } from "zod";
import { forbidden, notFound } from "../../lib/app-error.js";
import { allowedBranches, attendanceAttorneyFilter, caseAssignmentFilter } from "../../lib/tenant.js";
import { requireAuth } from "../auth/auth.middleware.js";

export const auditRouter = Router();
const entitySchema = z.object({ entityType: z.enum(["CLIENT", "ATTENDANCE", "LEGAL_CASE", "FEE_CONTRACT"]), entityId: z.string().uuid() });

auditRouter.get("/entity/:entityType/:entityId", requireAuth, async (request, response) => {
  const auth = request.auth!;
  const { entityType, entityId } = entitySchema.parse(request.params);
  const branches = allowedBranches(auth);
  const requiredPermission = { CLIENT: "client.read", ATTENDANCE: "attendance.read", LEGAL_CASE: "case.read", FEE_CONTRACT: "finance.read" }[entityType];
  if (!auth.permissions.includes(requiredPermission as never)) throw forbidden();

  const items = await withTenant(auth.tenantId, async (tx) => {
    if (entityType === "CLIENT") {
      const exists = await tx.client.findFirst({ where: { tenantId: auth.tenantId, id: entityId, ...(branches ? { primaryBranchId: { in: branches } } : {}) }, select: { id: true } });
      if (!exists) throw notFound();
    } else if (entityType === "ATTENDANCE") {
      const exists = await tx.attendance.findFirst({ where: { tenantId: auth.tenantId, id: entityId, ...(branches ? { branchId: { in: branches } } : {}), ...attendanceAttorneyFilter(auth) }, select: { id: true } });
      if (!exists) throw notFound();
    } else if (entityType === "LEGAL_CASE") {
      const exists = await tx.legalCase.findFirst({ where: { tenantId: auth.tenantId, id: entityId, ...(branches ? { branchId: { in: branches } } : {}), ...caseAssignmentFilter(auth) }, select: { id: true } });
      if (!exists) throw notFound();
    } else {
      const exists = await tx.feeContract.findFirst({ where: { tenantId: auth.tenantId, id: entityId, ...(branches ? { branchId: { in: branches } } : {}) }, select: { id: true } });
      if (!exists) throw notFound();
    }
    return tx.auditLog.findMany({ where: { tenantId: auth.tenantId, entityType, entityId }, include: { actor: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 200 });
  });
  response.json({ items });
});
