import type { TenantTransaction } from "@chronostek/database";

// #3 — Itens padrão quando a área do processo ainda não tem um modelo de checklist.
// A estrutura permite, no futuro, modelos por tipo de processo sem travar agora.
const DEFAULT_CHECKLIST_ITEMS = [
  "Documento de identidade",
  "CPF",
  "Comprovante de residência",
  "Procuração",
  "Documentos do caso",
];

// Cria automaticamente um checklist inicial vinculado ao processo. Usa um modelo
// ativo da área jurídica, se existir; caso contrário, um checklist padrão.
// Registra a criação no histórico do processo (entidade LEGAL_CASE).
export async function createInitialChecklist(
  tx: TenantTransaction,
  tenantId: string,
  caseId: string,
  legalAreaId: string,
  actorUserId: string,
) {
  const template = await tx.checklistTemplate.findFirst({
    where: { tenantId, legalAreaId, isActive: true },
    include: { items: { orderBy: { position: "asc" } } },
  });
  const name = template?.name ?? "Checklist inicial";
  const items =
    template && template.items.length
      ? template.items.map((item) => ({
          tenantId,
          title: item.title,
          description: item.description,
          isRequired: item.isRequired,
          position: item.position,
        }))
      : DEFAULT_CHECKLIST_ITEMS.map((title, position) => ({ tenantId, title, position }));

  const checklist = await tx.caseChecklist.create({
    data: { tenantId, caseId, templateId: template?.id, name, items: { create: items } },
  });
  await tx.auditLog.create({
    data: {
      tenantId,
      actorUserId,
      entityType: "LEGAL_CASE",
      entityId: caseId,
      action: "CHECKLIST_CREATED",
      description: `Checklist "${name}" criado automaticamente`,
    },
  });
  return checklist;
}
