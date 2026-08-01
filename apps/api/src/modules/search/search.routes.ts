import { withTenant } from "@chronostek/database";
import { Router } from "express";
import { z } from "zod";
import { normalizeSearch } from "../../lib/field-crypto.js";
import {
  allowedBranches,
  attendanceAttorneyFilter,
  caseAssignmentFilter,
  deadlineAttorneyFilter,
  documentAttorneyFilter,
} from "../../lib/tenant.js";
import { requireAuth } from "../auth/auth.middleware.js";

export const searchRouter = Router();
const searchSchema = z.object({ q: z.string().trim().min(2).max(100) });
type Result = {
  type: string;
  id: string;
  title: string;
  context: string;
  href: string;
  tabKey: string;
};

searchRouter.get("/", requireAuth, async (request, response) => {
  const auth = request.auth!;
  const { q } = searchSchema.parse(request.query);
  const branches = allowedBranches(auth);
  const ownOnly =
    auth.roles.includes("ADVOGADO") &&
    !auth.roles.some(
      (role) => role === "ADMIN_GERAL" || role === "GESTOR_FILIAL",
    );
  const normalized = normalizeSearch(q);
  const results = await withTenant(auth.tenantId, async (tx) => {
    const items: Result[] = [];
    const [
      clients,
      cases,
      attendances,
      deadlines,
      documents,
      contracts,
      users,
      hearings,
      tasks,
    ] = await Promise.all([
      auth.permissions.includes("client.read")
        ? tx.client.findMany({
            where: {
              tenantId: auth.tenantId,
              deletedAt: null,
              ...(branches ? { primaryBranchId: { in: branches } } : {}),
              OR: [
                { searchName: { contains: normalized } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            },
            select: { id: true, name: true, email: true },
            take: 8,
          })
        : [],
      auth.permissions.includes("case.read")
        ? tx.legalCase.findMany({
            where: {
              tenantId: auth.tenantId,
              deletedAt: null,
              ...(branches ? { branchId: { in: branches } } : {}),
              ...caseAssignmentFilter(auth),
              OR: [
                {
                  processNumberSearch: {
                    contains: normalized.replace(/\s/g, ""),
                  },
                },
                { caseType: { contains: q, mode: "insensitive" } },
                { opposingParty: { contains: q, mode: "insensitive" } },
              ],
            },
            select: {
              id: true,
              processNumber: true,
              caseType: true,
              opposingParty: true,
            },
            take: 8,
          })
        : [],
      auth.permissions.includes("attendance.read")
        ? tx.attendance.findMany({
            where: {
              tenantId: auth.tenantId,
              deletedAt: null,
              ...(branches ? { branchId: { in: branches } } : {}),
              ...attendanceAttorneyFilter(auth),
              clientName: { contains: q, mode: "insensitive" },
            },
            select: { id: true, clientName: true, status: true },
            take: 6,
          })
        : [],
      auth.permissions.includes("deadline.read")
        ? tx.deadline.findMany({
            where: {
              tenantId: auth.tenantId,
              deletedAt: null,
              ...(branches ? { branchId: { in: branches } } : {}),
              ...deadlineAttorneyFilter(auth),
              title: { contains: q, mode: "insensitive" },
            },
            select: { id: true, title: true, caseId: true, dueAt: true },
            take: 6,
          })
        : [],
      auth.permissions.includes("document.read")
        ? tx.document.findMany({
            where: {
              tenantId: auth.tenantId,
              deletedAt: null,
              ...(branches ? { branchId: { in: branches } } : {}),
              ...documentAttorneyFilter(auth),
              name: { contains: q, mode: "insensitive" },
            },
            select: {
              id: true,
              name: true,
              type: true,
              caseId: true,
              clientId: true,
            },
            take: 6,
          })
        : [],
      auth.permissions.includes("finance.read")
        ? tx.feeContract.findMany({
            where: {
              tenantId: auth.tenantId,
              deletedAt: null,
              ...(branches ? { branchId: { in: branches } } : {}),
              client: { searchName: { contains: normalized } },
            },
            select: {
              id: true,
              status: true,
              client: { select: { name: true } },
            },
            take: 6,
          })
        : [],
      auth.permissions.includes("user.manage")
        ? tx.user.findMany({
            where: {
              tenantId: auth.tenantId,
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            },
            select: { id: true, name: true, email: true },
            take: 6,
          })
        : [],
      auth.permissions.includes("hearing.read")
        ? tx.hearing.findMany({
            where: {
              tenantId: auth.tenantId,
              deletedAt: null,
              ...(branches ? { branchId: { in: branches } } : {}),
              ...(ownOnly
                ? {
                    OR: [
                      { attorneyId: auth.userId },
                      { assistantId: auth.userId },
                    ],
                  }
                : {}),
              type: { contains: q, mode: "insensitive" },
            },
            select: { id: true, type: true, startsAt: true, status: true },
            take: 6,
          })
        : [],
      auth.permissions.includes("task.read")
        ? tx.task.findMany({
            where: {
              tenantId: auth.tenantId,
              deletedAt: null,
              ...(branches
                ? { OR: [{ branchId: null }, { branchId: { in: branches } }] }
                : {}),
              ...(ownOnly ? { assigneeId: auth.userId } : {}),
              title: { contains: q, mode: "insensitive" },
            },
            select: { id: true, title: true, status: true },
            take: 6,
          })
        : [],
    ]);
    items.push(
      ...clients.map((x) => ({
        type: "Cliente",
        id: x.id,
        title: x.name,
        context: x.email ?? "Cadastro de cliente",
        href: `/clientes/${x.id}`,
        tabKey: `cliente:${x.id}`,
      })),
    );
    items.push(
      ...cases.map((x) => ({
        type: "Processo",
        id: x.id,
        title: x.processNumber ?? x.caseType,
        context: x.opposingParty
          ? `Parte contrária: ${x.opposingParty}`
          : x.caseType,
        href: `/processos/${x.id}`,
        tabKey: `processo:${x.id}`,
      })),
    );
    items.push(
      ...attendances.map((x) => ({
        type: "Atendimento",
        id: x.id,
        title: x.clientName,
        context: x.status,
        href: `/atendimentos/${x.id}`,
        tabKey: `atendimento:${x.id}`,
      })),
    );
    items.push(
      ...deadlines.map((x) => ({
        type: "Prazo",
        id: x.id,
        title: x.title,
        context: x.dueAt.toLocaleDateString("pt-BR"),
        href: `/prazos?search=${encodeURIComponent(x.title)}`,
        tabKey: `prazo:${x.id}`,
      })),
    );
    items.push(
      ...documents.map((x) => ({
        type: "Documento",
        id: x.id,
        title: x.name,
        context: x.type,
        href: x.caseId ? `/processos/${x.caseId}` : `/clientes/${x.clientId}`,
        tabKey: `documento:${x.id}`,
      })),
    );
    items.push(
      ...contracts.map((x) => ({
        type: "Contrato",
        id: x.id,
        title: x.client.name,
        context: x.status,
        href: `/financeiro/contratos/${x.id}`,
        tabKey: `contrato:${x.id}`,
      })),
    );
    items.push(
      ...users.map((x) => ({
        type: "Usuário",
        id: x.id,
        title: x.name,
        context: x.email,
        href: "/administracao/usuarios",
        tabKey: `usuario:${x.id}`,
      })),
    );
    items.push(
      ...hearings.map((x) => ({
        type: "Audiência",
        id: x.id,
        title: x.type,
        context: `${x.status} · ${x.startsAt.toLocaleDateString("pt-BR")}`,
        href: `/audiencias?search=${encodeURIComponent(x.type)}`,
        tabKey: `audiencia:${x.id}`,
      })),
    );
    items.push(
      ...tasks.map((x) => ({
        type: "Tarefa",
        id: x.id,
        title: x.title,
        context: x.status,
        href: `/tarefas?search=${encodeURIComponent(x.title)}`,
        tabKey: `tarefa:${x.id}`,
      })),
    );
    return items.slice(0, 30);
  });
  response.json({ items: results });
});
