import { listQuerySchema } from "@chronostek/contracts";
import { Prisma, withTenant } from "@chronostek/database";
import { Router } from "express";
import { createReadStream } from "node:fs";
import multer from "multer";
import { z } from "zod";
import { allowedBranches, assertBranch, documentAttorneyFilter } from "../../lib/tenant.js";
import { notFound } from "../../lib/app-error.js";
import { assertCaseRelations, assertClientBranch } from "../../lib/entity-access.js";
import { requireAuth, requirePermission } from "../auth/auth.middleware.js";
import {
  removeLocalFile,
  resolveStoredFile,
  saveLocalFile,
} from "./storage.js";

export const documentsRouter = Router();
const maxBytes = Number(process.env.MAX_UPLOAD_SIZE_MB ?? 20) * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxBytes, files: 1 },
});

const metadataSchema = z
  .object({
    branchId: z.string().uuid(),
    clientId: z.string().uuid().optional(),
    caseId: z.string().uuid().optional(),
    name: z.string().trim().min(2).max(200),
    type: z.string().trim().min(2).max(100),
    notes: z.string().trim().max(5000).optional(),
  })
  .refine((data) => data.clientId || data.caseId, {
    message: "Informe cliente ou processo.",
  });
const documentQuerySchema = listQuerySchema.extend({ clientId: z.string().uuid().optional(), caseId: z.string().uuid().optional() });
const documentUpdateSchema = z.object({ status: z.enum(["PENDING", "RECEIVED", "UNDER_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"]), notes: z.string().trim().max(5000).optional() });

documentsRouter.get(
  "/",
  requireAuth,
  requirePermission("document.read"),
  async (request, response) => {
    const auth = request.auth!;
    const query = documentQuerySchema.parse(request.query);
    const branches = allowedBranches(auth, query.branchId);
    const where: Prisma.DocumentWhereInput = {
      tenantId: auth.tenantId,
      ...(branches ? { branchId: { in: branches } } : {}),
      ...documentAttorneyFilter(auth),
      ...(query.status ? { status: query.status as never } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.caseId ? { caseId: query.caseId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              {
                client: {
                  searchName: { contains: query.search.toLowerCase() },
                },
              },
            ],
          }
        : {}),
    };
    const data = await withTenant(auth.tenantId, async (tx) => {
      const [items, total] = await Promise.all([
        tx.document.findMany({
          where,
          include: {
            branch: { select: { name: true } },
            client: { select: { name: true } },
            case: { select: { caseType: true, processNumber: true } },
            uploadedBy: { select: { name: true } },
            storedFile: {
              select: { originalName: true, sizeBytes: true, mimeType: true },
            },
          },
          orderBy: { sentAt: "desc" },
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        tx.document.count({ where }),
      ]);
      return {
        items: items.map((item) => ({
          ...item,
          storedFile: item.storedFile
            ? {
                ...item.storedFile,
                sizeBytes: item.storedFile.sizeBytes.toString(),
              }
            : null,
        })),
        total,
        page: query.page,
        pageSize: query.pageSize,
      };
    });
    response.json(data);
  },
);

documentsRouter.post(
  "/",
  requireAuth,
  requirePermission("document.upload"),
  upload.single("file"),
  async (request, response) => {
    const auth = request.auth!;
    if (!request.file) throw new Error("Arquivo obrigatório.");
    const metadata = metadataSchema.parse(request.body);
    assertBranch(auth, metadata.branchId);
    await withTenant(auth.tenantId, async (tx) => {
      await assertClientBranch(tx, auth.tenantId, metadata.clientId, metadata.branchId);
      if (metadata.caseId) await assertCaseRelations(tx, auth.tenantId, { caseId: metadata.caseId, branchId: metadata.branchId, clientId: metadata.clientId });
    });
    const saved = await saveLocalFile(auth.tenantId, request.file);
    try {
      const document = await withTenant(auth.tenantId, async (tx) => {
        const storedFile = await tx.storedFile.create({
          data: {
            tenantId: auth.tenantId,
            uploadedById: auth.userId,
            driver: "LOCAL",
            objectKey: saved.objectKey,
            originalName: request.file!.originalname.slice(0, 255),
            mimeType: request.file!.mimetype,
            sizeBytes: request.file!.size,
            checksum: saved.checksum,
          },
        });
        const item = await tx.document.create({
          data: {
            tenantId: auth.tenantId,
            branchId: metadata.branchId,
            clientId: metadata.clientId,
            caseId: metadata.caseId,
            storedFileId: storedFile.id,
            uploadedById: auth.userId,
            name: metadata.name,
            type: metadata.type,
            notes: metadata.notes,
            status: "RECEIVED",
          },
        });
        await tx.auditLog.create({
          data: {
            tenantId: auth.tenantId,
            actorUserId: auth.userId,
            entityType: "DOCUMENT",
            entityId: item.id,
            action: "DOCUMENT_UPLOADED",
            description: `Documento ${item.name} anexado`,
          },
        });
        if (item.caseId) await tx.auditLog.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, entityType: "LEGAL_CASE", entityId: item.caseId, action: "DOCUMENT_UPLOADED", description: `Documento ${item.name} anexado` } });
        return item;
      });
      response.status(201).json({ id: document.id });
    } catch (error) {
      await removeLocalFile(saved.absolutePath);
      throw error;
    }
  },
);

documentsRouter.patch("/:id", requireAuth, requirePermission("document.upload"), async (request, response) => {
  const auth = request.auth!;
  const input = documentUpdateSchema.parse(request.body);
  const item = await withTenant(auth.tenantId, async (tx) => {
    const branches = allowedBranches(auth);
    const existing = await tx.document.findFirst({ where: { tenantId: auth.tenantId, id: String(request.params.id), ...(branches ? { branchId: { in: branches } } : {}), ...documentAttorneyFilter(auth) } });
    if (!existing) throw notFound();
    const updated = await tx.document.update({ where: { tenantId_id: { tenantId: auth.tenantId, id: existing.id } }, data: input });
    await tx.auditLog.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, entityType: "DOCUMENT", entityId: updated.id, action: "DOCUMENT_STATUS_UPDATED", description: `Documento ${updated.name} alterado para ${updated.status}` } });
    if (updated.caseId) await tx.auditLog.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, entityType: "LEGAL_CASE", entityId: updated.caseId, action: "DOCUMENT_STATUS_UPDATED", description: `Documento ${updated.name} alterado para ${updated.status}` } });
    return updated;
  });
  response.json(item);
});

documentsRouter.get(
  "/:id/download",
  requireAuth,
  requirePermission("document.read"),
  async (request, response) => {
    const auth = request.auth!;
    const branches = allowedBranches(auth);
    const document = await withTenant(auth.tenantId, (tx) =>
      tx.document.findFirst({
        where: {
          tenantId: auth.tenantId,
          id: String(request.params.id),
          ...(branches ? { branchId: { in: branches } } : {}),
          ...documentAttorneyFilter(auth),
        },
        include: { storedFile: true },
      }),
    );
    if (!document?.storedFile || document.storedFile.deletedAt)
      throw notFound();
    response.setHeader("content-type", document.storedFile.mimeType);
    response.setHeader(
      "content-length",
      document.storedFile.sizeBytes.toString(),
    );
    response.setHeader(
      "content-disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(document.storedFile.originalName)}`,
    );
    createReadStream(resolveStoredFile(document.storedFile.objectKey)).pipe(
      response,
    );
  },
);
