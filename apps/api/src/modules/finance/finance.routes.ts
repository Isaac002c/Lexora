import {
  collectionNoteSchema,
  deletionReasonSchema,
  feeContractCreateSchema,
  feeContractUpdateSchema,
  listQuerySchema,
  optionalEnum,
  paymentSchema,
} from "@chronostek/contracts";
import { Prisma, withTenant } from "@chronostek/database";
import { Router } from "express";
import { createReadStream } from "node:fs";
import { addMonths } from "date-fns";
import multer from "multer";
import { z } from "zod";
import { installmentAging } from "../../lib/deadline.js";
import { allowedBranches, assertBranch } from "../../lib/tenant.js";
import { forbidden, notFound } from "../../lib/app-error.js";
import { assertCaseRelations, assertClientBranch } from "../../lib/entity-access.js";
import { recordAudit } from "../../lib/audit.js";
import { normalizeSearch } from "../../lib/field-crypto.js";
import { requireAuth, requirePermission } from "../auth/auth.middleware.js";
import { removeLocalFile, resolveStoredFile, saveLocalFile } from "../documents/storage.js";

export const financeRouter = Router();
const proofUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } });
const financeQuerySchema = listQuerySchema.extend({ view: optionalEnum(["upcoming", "overdue", "delinquent", "paid", "cancelled"]) });
const financeAnalyticsQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  branchId: z.string().uuid().optional(),
  legalAreaId: z.string().uuid().optional(),
  responsibleId: z.string().uuid().optional(),
});

financeRouter.get(
  "/contracts",
  requireAuth,
  requirePermission("finance.read"),
  async (request, response) => {
    const auth = request.auth!;
    const query = financeQuerySchema.parse(request.query);
    if (query.deleted !== "exclude" && !auth.permissions.includes("finance.restore")) throw forbidden();
    const branches = allowedBranches(auth, query.branchId);
    const where: Prisma.FeeContractWhereInput = {
      tenantId: auth.tenantId,
      ...(query.deleted === "only" ? { deletedAt: { not: null } } : query.deleted === "exclude" ? { deletedAt: null } : {}),
      ...(branches ? { branchId: { in: branches } } : {}),
      ...(query.status ? { status: query.status as never } : {}),
      ...(query.search
        ? {
            OR: [
              { client: { searchName: { contains: normalizeSearch(query.search) } } },
              { case: { processNumberSearch: { contains: normalizeSearch(query.search).replace(/\s/g, "") } } },
              { case: { caseName: { contains: query.search, mode: "insensitive" } } },
            ],
          }
        : {}),
      ...(query.view === "upcoming" ? { installments: { some: { status: "PENDING", dueDate: { gte: new Date(), lte: new Date(Date.now() + 7 * 86_400_000) } } } } : {}),
      ...(query.view === "overdue" ? { installments: { some: { status: "PENDING", dueDate: { lt: new Date() } } } } : {}),
      ...(query.view === "delinquent" ? { installments: { some: { status: "PENDING", dueDate: { lt: new Date(Date.now() - 15 * 86_400_000) } } } } : {}),
      ...(query.view === "paid" ? { installments: { some: { status: "PAID" } } } : {}),
      ...(query.view === "cancelled" ? { status: "CANCELLED" } : {}),
    };
    const data = await withTenant(auth.tenantId, async (tx) => {
      const [items, total] = await Promise.all([
        tx.feeContract.findMany({
          where,
          include: {
            client: { select: { name: true, phone: true } },
            branch: { select: { name: true } },
            case: { select: { caseName: true, caseType: true, processNumber: true, legalArea: { select: { name: true } }, assignments: { where: { type: "INTERNAL_OWNER" }, select: { user: { select: { name: true } } } } } },
            installments: { where: { deletedAt: null }, orderBy: { installmentNumber: "asc" } },
          },
          orderBy: { createdAt: "desc" },
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        tx.feeContract.count({ where }),
      ]);
      return {
        items: items.map((item) => ({
          ...item,
          feeAmount: item.feeAmount.toFixed(2),
          costAmount: item.costAmount.toFixed(2),
          installments: item.installments.map((installment) => ({
            ...installment,
            amount: installment.amount.toFixed(2),
            agingStatus: installmentAging(
              installment.dueDate,
              installment.status,
            ),
          })),
        })),
        total,
        page: query.page,
        pageSize: query.pageSize,
      };
    });
    response.json(data);
  },
);

financeRouter.get("/summary", requireAuth, requirePermission("finance.read"), async (request, response) => {
  const auth = request.auth!;
  const query = listQuerySchema.parse(request.query);
  const branches = allowedBranches(auth, query.branchId);
  const branchFilter = branches ? { in: branches } : undefined;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const summary = await withTenant(auth.tenantId, async (tx) => {
    const [contracted, activeContracts, upcoming, overdue, delinquent, received, costs, completed] = await Promise.all([
      tx.feeContract.aggregate({ where: { tenantId: auth.tenantId, deletedAt: null, status: { in: ["ACTIVE", "COMPLETED"] }, ...(branchFilter ? { branchId: branchFilter } : {}) }, _sum: { feeAmount: true } }),
      tx.feeContract.count({ where: { tenantId: auth.tenantId, deletedAt: null, status: "ACTIVE", ...(branchFilter ? { branchId: branchFilter } : {}) } }),
      tx.paymentInstallment.count({ where: { tenantId: auth.tenantId, deletedAt: null, status: "PENDING", dueDate: { gte: now, lte: new Date(now.getTime() + 7 * 86_400_000) }, contract: { deletedAt: null, ...(branchFilter ? { branchId: branchFilter } : {}) } } }),
      tx.paymentInstallment.count({ where: { tenantId: auth.tenantId, deletedAt: null, status: "PENDING", dueDate: { lt: now }, contract: { deletedAt: null, ...(branchFilter ? { branchId: branchFilter } : {}) } } }),
      tx.paymentInstallment.count({ where: { tenantId: auth.tenantId, deletedAt: null, status: "PENDING", dueDate: { lt: new Date(now.getTime() - 15 * 86_400_000) }, contract: { deletedAt: null, ...(branchFilter ? { branchId: branchFilter } : {}) } } }),
      tx.paymentInstallment.aggregate({ where: { tenantId: auth.tenantId, deletedAt: null, status: "PAID", paidAt: { gte: monthStart }, contract: { deletedAt: null, ...(branchFilter ? { branchId: branchFilter } : {}) } }, _sum: { amount: true } }),
      tx.feeContract.aggregate({ where: { tenantId: auth.tenantId, deletedAt: null, ...(branchFilter ? { branchId: branchFilter } : {}) }, _sum: { costAmount: true } }),
      tx.feeContract.count({ where: { tenantId: auth.tenantId, deletedAt: null, status: "COMPLETED", ...(branchFilter ? { branchId: branchFilter } : {}) } }),
    ]);
    return { contracted: contracted._sum.feeAmount?.toFixed(2) ?? "0.00", activeContracts, upcoming, overdue, delinquent, receivedThisMonth: received._sum.amount?.toFixed(2) ?? "0.00", costs: costs._sum.costAmount?.toFixed(2) ?? "0.00", completedContracts: completed };
  });
  response.json(summary);
});

financeRouter.get("/analytics", requireAuth, requirePermission("finance.read"), async (request, response) => {
  const auth = request.auth!;
  const query = financeAnalyticsQuerySchema.parse(request.query);
  const year = query.year ?? new Date().getFullYear();
  const dueFrom = new Date(Date.UTC(year, 0, 1));
  const dueTo = new Date(Date.UTC(year + 1, 0, 1));
  const instantFrom = new Date(`${year}-01-01T00:00:00-03:00`);
  const instantTo = new Date(`${year + 1}-01-01T00:00:00-03:00`);
  const branches = allowedBranches(auth, query.branchId);
  const contractScope: Prisma.FeeContractWhereInput = {
    tenantId: auth.tenantId,
    deletedAt: null,
    status: { not: "CANCELLED" },
    ...(branches ? { branchId: { in: branches } } : {}),
    ...(query.legalAreaId || query.responsibleId
      ? {
          case: {
            ...(query.legalAreaId ? { legalAreaId: query.legalAreaId } : {}),
            ...(query.responsibleId
              ? { assignments: { some: { userId: query.responsibleId } } }
              : {}),
          },
        }
      : {}),
  };
  const result = await withTenant(auth.tenantId, async (tx) => {
    const [installments, contracts] = await Promise.all([
      tx.paymentInstallment.findMany({
        where: {
          tenantId: auth.tenantId,
          deletedAt: null,
          contract: contractScope,
          OR: [
            { dueDate: { gte: dueFrom, lt: dueTo } },
            { paidAt: { gte: instantFrom, lt: instantTo } },
          ],
        },
        select: {
          amount: true,
          dueDate: true,
          paidAt: true,
          status: true,
        },
      }),
      tx.feeContract.findMany({
        where: { ...contractScope, createdAt: { gte: instantFrom, lt: instantTo } },
        select: {
          feeAmount: true,
          costAmount: true,
          branch: { select: { id: true, name: true } },
          case: {
            select: {
              legalArea: { select: { id: true, name: true } },
              assignments: {
                where: { type: "INTERNAL_OWNER" },
                select: { user: { select: { id: true, name: true } } },
              },
            },
          },
        },
      }),
    ]);

    const months = Array.from({ length: 12 }, (_, month) => ({
      month: month + 1,
      projected: 0,
      received: 0,
      overdue: 0,
      projectedCount: 0,
      receivedCount: 0,
      overdueCount: 0,
    }));
    const now = new Date();
    for (const installment of installments) {
      const amount = installment.amount.toNumber();
      if (installment.dueDate >= dueFrom && installment.dueDate < dueTo) {
        const entry = months[installment.dueDate.getUTCMonth()]!;
        entry.projected += amount;
        entry.projectedCount += 1;
        if (installment.status === "PENDING" && installment.dueDate < now) {
          entry.overdue += amount;
          entry.overdueCount += 1;
        }
      }
      if (installment.status === "PAID" && installment.paidAt && installment.paidAt >= instantFrom && installment.paidAt < instantTo) {
        const paidMonth = Number(new Intl.DateTimeFormat("en-US", { month: "numeric", timeZone: "America/Sao_Paulo" }).format(installment.paidAt)) - 1;
        const entry = months[paidMonth]!;
        entry.received += amount;
        entry.receivedCount += 1;
      }
    }

    type Cut = { name: string; contracts: number; amount: number };
    const addCut = (map: Map<string, Cut>, id: string, name: string, amount: number) => {
      const current = map.get(id) ?? { name, contracts: 0, amount: 0 };
      current.contracts += 1;
      current.amount += amount;
      map.set(id, current);
    };
    const byBranch = new Map<string, Cut>();
    const byArea = new Map<string, Cut>();
    const byResponsible = new Map<string, Cut>();
    let contracted = 0;
    let costs = 0;
    for (const contract of contracts) {
      const amount = contract.feeAmount.toNumber();
      contracted += amount;
      costs += contract.costAmount.toNumber();
      addCut(byBranch, contract.branch.id, contract.branch.name, amount);
      if (contract.case) {
        addCut(byArea, contract.case.legalArea.id, contract.case.legalArea.name, amount);
        for (const assignment of contract.case.assignments) {
          addCut(byResponsible, assignment.user.id, assignment.user.name, amount);
        }
      } else {
        addCut(byArea, "unlinked", "Sem processo vinculado", amount);
        addCut(byResponsible, "unassigned", "Sem responsável definido", amount);
      }
    }
    const serializeCuts = (map: Map<string, Cut>) =>
      [...map.values()]
        .sort((left, right) => right.amount - left.amount)
        .map((item) => ({ ...item, amount: item.amount.toFixed(2) }));
    const projected = months.reduce((total, month) => total + month.projected, 0);
    const received = months.reduce((total, month) => total + month.received, 0);
    const overdue = months.reduce((total, month) => total + month.overdue, 0);
    return {
      year,
      totals: {
        contracted: contracted.toFixed(2),
        costs: costs.toFixed(2),
        projected: projected.toFixed(2),
        received: received.toFixed(2),
        overdue: overdue.toFixed(2),
        receiptRate: projected > 0 ? Number(((received / projected) * 100).toFixed(1)) : 0,
      },
      months: months.map((month) => ({
        ...month,
        projected: month.projected.toFixed(2),
        received: month.received.toFixed(2),
        overdue: month.overdue.toFixed(2),
      })),
      byBranch: serializeCuts(byBranch),
      byArea: serializeCuts(byArea),
      byResponsible: serializeCuts(byResponsible),
    };
  });
  response.json(result);
});

financeRouter.get("/contracts/:id", requireAuth, requirePermission("finance.read"), async (request, response) => {
  const auth = request.auth!;
  const branches = allowedBranches(auth);
  const item = await withTenant(auth.tenantId, async (tx) => {
    const contract = await tx.feeContract.findFirst({ where: { tenantId: auth.tenantId, id: String(request.params.id), ...(branches ? { branchId: { in: branches } } : {}) }, include: { client: { select: { id: true, name: true } }, branch: { select: { id: true, name: true } }, case: { select: { id: true, caseType: true, processNumber: true } }, installments: { where: { deletedAt: null }, orderBy: { installmentNumber: "asc" } } } });
    if (!contract) throw notFound();
    if (contract.deletedAt && !auth.permissions.includes("finance.restore")) throw notFound();
    const proofIds = contract.installments.flatMap((installment) => installment.paymentProofFileId ? [installment.paymentProofFileId] : []);
    const proofs = await tx.storedFile.findMany({ where: { tenantId: auth.tenantId, id: { in: proofIds }, deletedAt: null }, select: { id: true, originalName: true, mimeType: true, sizeBytes: true } });
    return { ...contract, feeAmount: contract.feeAmount.toFixed(2), costAmount: contract.costAmount.toFixed(2), installments: contract.installments.map((installment) => ({ ...installment, amount: installment.amount.toFixed(2), agingStatus: installmentAging(installment.dueDate, installment.status), proof: proofs.find((proof) => proof.id === installment.paymentProofFileId) ? { ...proofs.find((proof) => proof.id === installment.paymentProofFileId)!, sizeBytes: proofs.find((proof) => proof.id === installment.paymentProofFileId)!.sizeBytes.toString() } : null })) };
  });
  response.json(item);
});

financeRouter.patch("/contracts/:id", requireAuth, requirePermission("finance.update"), async (request, response) => {
  const auth = request.auth!;
  const input = feeContractUpdateSchema.parse(request.body);
  const item = await withTenant(auth.tenantId, async (tx) => {
    const existing = await tx.feeContract.findFirst({ where: { tenantId: auth.tenantId, id: String(request.params.id), deletedAt: null } });
    if (!existing) throw notFound();
    assertBranch(auth, existing.branchId);
    const updated = await tx.feeContract.update({ where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } }, data: input });
    await tx.auditLog.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, entityType: "FEE_CONTRACT", entityId: updated.id, action: input.status === "COMPLETED" ? "CONTRACT_COMPLETED" : input.status === "CANCELLED" ? "CONTRACT_CANCELLED" : "CONTRACT_UPDATED", description: input.status ? `Contrato alterado para ${input.status}` : "Contrato financeiro atualizado" } });
    return updated;
  });
  response.json({ id: item.id });
});

financeRouter.post("/contracts/:id/collection-notes", requireAuth, requirePermission("finance.update"), async (request, response) => {
  const auth = request.auth!;
  const input = collectionNoteSchema.parse(request.body);
  await withTenant(auth.tenantId, async (tx) => {
    const contract = await tx.feeContract.findFirst({ where: { tenantId: auth.tenantId, id: String(request.params.id), deletedAt: null } });
    if (!contract) throw notFound();
    assertBranch(auth, contract.branchId);
    if (input.installmentId) {
      const installment = await tx.paymentInstallment.findFirst({ where: { tenantId: auth.tenantId, id: input.installmentId, contractId: contract.id, deletedAt: null }, select: { id: true } });
      if (!installment) throw notFound("A parcela não pertence ao contrato informado.");
    }
    await tx.auditLog.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, entityType: "FEE_CONTRACT", entityId: contract.id, action: "COLLECTION_NOTE_ADDED", description: input.note, metadata: input.installmentId ? { installmentId: input.installmentId } : undefined } });
  });
  response.status(201).json({ success: true });
});

financeRouter.post(
  "/contracts",
  requireAuth,
  requirePermission("finance.update"),
  async (request, response) => {
    const auth = request.auth!;
    const input = feeContractCreateSchema.parse(request.body);
    assertBranch(auth, input.branchId);
    const item = await withTenant(auth.tenantId, async (tx) => {
      await assertClientBranch(tx, auth.tenantId, input.clientId, input.branchId);
      if (input.caseId) await assertCaseRelations(tx, auth.tenantId, { caseId: input.caseId, branchId: input.branchId, clientId: input.clientId });
      const installmentAmount = new Prisma.Decimal(input.feeAmount)
        .plus(input.costAmount)
        .div(input.installmentCount)
        .toDecimalPlaces(2);
      const contract = await tx.feeContract.create({
        data: {
          tenantId: auth.tenantId,
          branchId: input.branchId,
          clientId: input.clientId,
          caseId: input.caseId,
          feeAmount: input.feeAmount,
          costAmount: input.costAmount,
          paymentMethod: input.paymentMethod,
          paymentTiming: input.paymentTiming,
          installmentCount: input.installmentCount,
          status: "ACTIVE",
          notes: input.notes,
          installments: {
            create: Array.from(
              { length: input.installmentCount },
              (_, index) => ({
                installmentNumber: index + 1,
                amount:
                  index === input.installmentCount - 1
                    ? new Prisma.Decimal(input.feeAmount)
                        .plus(input.costAmount)
                        .minus(
                          installmentAmount.mul(input.installmentCount - 1),
                        )
                    : installmentAmount,
                dueDate: addMonths(input.firstDueDate, index),
              }),
            ),
          },
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId: auth.tenantId,
          actorUserId: auth.userId,
          entityType: "FEE_CONTRACT",
          entityId: contract.id,
          action: "CONTRACT_CREATED",
          description: "Contrato de honorários criado",
        },
      });
      return contract;
    });
    response.status(201).json({ id: item.id });
  },
);

financeRouter.post(
  "/installments/:id/pay",
  requireAuth,
  requirePermission("finance.update"),
  async (request, response) => {
    const auth = request.auth!;
    const input = paymentSchema.parse(request.body);
    const item = await withTenant(auth.tenantId, async (tx) => {
      const existing = await tx.paymentInstallment.findFirst({
        where: { tenantId: auth.tenantId, id: String(request.params.id), deletedAt: null, contract: { deletedAt: null } },
        include: { contract: true },
      });
      if (!existing) throw notFound();
      assertBranch(auth, existing.contract.branchId);
      const updated = await tx.paymentInstallment.update({
        where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } },
        data: {
          status: "PAID",
          paidAt: input.paidAt,
          notes: input.notes,
          paymentRecordedById: auth.userId,
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId: auth.tenantId,
          actorUserId: auth.userId,
          entityType: "PAYMENT_INSTALLMENT",
          entityId: updated.id,
          action: "PAYMENT_RECORDED",
          description: `Pagamento da parcela ${updated.installmentNumber} registrado`,
        },
      });
      await tx.auditLog.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, entityType: "FEE_CONTRACT", entityId: existing.contractId, action: "PAYMENT_RECORDED", description: `Pagamento da parcela ${updated.installmentNumber} registrado` } });
      return updated;
    });
    response.json(item);
  },
);

financeRouter.post("/installments/:id/proof", requireAuth, requirePermission("finance.update"), proofUpload.single("file"), async (request, response) => {
  const auth = request.auth!;
  if (!request.file) throw new Error("Arquivo obrigatório.");
  const existing = await withTenant(auth.tenantId, (tx) => tx.paymentInstallment.findFirst({ where: { tenantId: auth.tenantId, id: String(request.params.id), deletedAt: null, contract: { deletedAt: null } }, include: { contract: true } }));
  if (!existing) throw notFound();
  assertBranch(auth, existing.contract.branchId);
  const saved = await saveLocalFile(auth.tenantId, request.file);
  try {
    const oldFile = await withTenant(auth.tenantId, async (tx) => {
      const previous = existing.paymentProofFileId ? await tx.storedFile.findFirst({ where: { tenantId: auth.tenantId, id: existing.paymentProofFileId } }) : null;
      const stored = await tx.storedFile.create({ data: { tenantId: auth.tenantId, uploadedById: auth.userId, driver: "LOCAL", objectKey: saved.objectKey, originalName: request.file!.originalname.slice(0, 255), mimeType: request.file!.mimetype, sizeBytes: request.file!.size, checksum: saved.checksum } });
      await tx.paymentInstallment.update({ where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } }, data: { paymentProofFileId: stored.id } });
      if (previous) await tx.storedFile.update({ where: { tenantId_id: { tenantId: auth.tenantId, id: previous.id } }, data: { deletedAt: new Date() } });
      await tx.auditLog.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, entityType: "FEE_CONTRACT", entityId: existing.contractId, action: "PAYMENT_PROOF_UPLOADED", description: `Comprovante anexado à parcela ${existing.installmentNumber}` } });
      return previous;
    });
    if (oldFile) await removeLocalFile(resolveStoredFile(oldFile.objectKey));
    response.status(201).json({ success: true });
  } catch (error) {
    await removeLocalFile(saved.absolutePath);
    throw error;
  }
});

financeRouter.get("/installments/:id/proof", requireAuth, requirePermission("finance.read"), async (request, response) => {
  const auth = request.auth!;
  const data = await withTenant(auth.tenantId, async (tx) => {
    const installment = await tx.paymentInstallment.findFirst({ where: { tenantId: auth.tenantId, id: String(request.params.id), deletedAt: null, contract: { deletedAt: null } }, include: { contract: true } });
    if (!installment?.paymentProofFileId) throw notFound();
    assertBranch(auth, installment.contract.branchId);
    const file = await tx.storedFile.findFirst({ where: { tenantId: auth.tenantId, id: installment.paymentProofFileId, deletedAt: null } });
    if (!file) throw notFound();
    return file;
  });
  response.setHeader("content-type", data.mimeType);
  response.setHeader("content-length", data.sizeBytes.toString());
  response.setHeader("content-disposition", `attachment; filename*=UTF-8''${encodeURIComponent(data.originalName)}`);
  createReadStream(resolveStoredFile(data.objectKey)).pipe(response);
});

financeRouter.delete("/contracts/:id", requireAuth, requirePermission("finance.delete"), async (request, response) => {
  const auth = request.auth!;
  const { reason } = deletionReasonSchema.parse(request.body);
  await withTenant(auth.tenantId, async (tx) => {
    const branches = allowedBranches(auth);
    const existing = await tx.feeContract.findFirst({ where: { tenantId: auth.tenantId, id: String(request.params.id), deletedAt: null, ...(branches ? { branchId: { in: branches } } : {}) } });
    if (!existing) throw notFound();
    const deleted = await tx.feeContract.update({ where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } }, data: { deletedAt: new Date(), deletedById: auth.userId, deletionReason: reason } });
    await recordAudit(tx, auth, request, { module: "FINANCEIRO", entityType: "FEE_CONTRACT", entityId: deleted.id, action: "CONTRACT_DELETED", description: "Contrato financeiro excluído logicamente", branchId: deleted.branchId, before: existing, after: deleted, reason });
  });
  response.status(204).send();
});

financeRouter.post("/contracts/:id/restore", requireAuth, requirePermission("finance.restore"), async (request, response) => {
  const auth = request.auth!;
  const { reason } = deletionReasonSchema.parse(request.body);
  const restored = await withTenant(auth.tenantId, async (tx) => {
    const branches = allowedBranches(auth);
    const existing = await tx.feeContract.findFirst({ where: { tenantId: auth.tenantId, id: String(request.params.id), deletedAt: { not: null }, ...(branches ? { branchId: { in: branches } } : {}) } });
    if (!existing) throw notFound();
    const contract = await tx.feeContract.update({ where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } }, data: { deletedAt: null, deletedById: null, deletionReason: null } });
    await recordAudit(tx, auth, request, { module: "FINANCEIRO", entityType: "FEE_CONTRACT", entityId: contract.id, action: "CONTRACT_RESTORED", description: "Contrato financeiro restaurado", branchId: contract.branchId, before: existing, after: contract, reason });
    return contract;
  });
  response.json({ id: restored.id });
});

financeRouter.delete("/installments/:id", requireAuth, requirePermission("finance.delete"), async (request, response) => {
  const auth = request.auth!;
  const { reason } = deletionReasonSchema.parse(request.body);
  await withTenant(auth.tenantId, async (tx) => {
    const existing = await tx.paymentInstallment.findFirst({ where: { tenantId: auth.tenantId, id: String(request.params.id), deletedAt: null }, include: { contract: true } });
    if (!existing) throw notFound();
    assertBranch(auth, existing.contract.branchId);
    const deleted = await tx.paymentInstallment.update({ where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } }, data: { deletedAt: new Date(), deletedById: auth.userId, deletionReason: reason } });
    await recordAudit(tx, auth, request, { module: "FINANCEIRO", entityType: "PAYMENT_INSTALLMENT", entityId: deleted.id, action: "INSTALLMENT_DELETED", description: `Parcela ${deleted.installmentNumber} excluída logicamente`, branchId: existing.contract.branchId, before: existing, after: deleted, reason });
  });
  response.status(204).send();
});

financeRouter.post("/installments/:id/restore", requireAuth, requirePermission("finance.restore"), async (request, response) => {
  const auth = request.auth!;
  const { reason } = deletionReasonSchema.parse(request.body);
  const restored = await withTenant(auth.tenantId, async (tx) => {
    const existing = await tx.paymentInstallment.findFirst({ where: { tenantId: auth.tenantId, id: String(request.params.id), deletedAt: { not: null } }, include: { contract: true } });
    if (!existing) throw notFound();
    assertBranch(auth, existing.contract.branchId);
    const installment = await tx.paymentInstallment.update({ where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } }, data: { deletedAt: null, deletedById: null, deletionReason: null } });
    await recordAudit(tx, auth, request, { module: "FINANCEIRO", entityType: "PAYMENT_INSTALLMENT", entityId: installment.id, action: "INSTALLMENT_RESTORED", description: `Parcela ${installment.installmentNumber} restaurada`, branchId: existing.contract.branchId, before: existing, after: installment, reason });
    return installment;
  });
  response.json({ id: restored.id });
});
