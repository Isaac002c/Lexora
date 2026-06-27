import type { TenantTransaction } from "@chronostek/database";
import { AppError } from "./app-error.js";

function invalid(message: string): never {
  throw new AppError(422, "Vínculo inválido", message, "https://chronostek.com.br/problems/invalid-relation");
}

export async function assertLegalArea(tx: TenantTransaction, tenantId: string, legalAreaId?: string) {
  if (!legalAreaId) return;
  const area = await tx.legalArea.findFirst({ where: { tenantId, id: legalAreaId, isActive: true }, select: { id: true } });
  if (!area) invalid("A área jurídica não pertence ao escritório ou está inativa.");
}

export async function assertUserBranchAccess(tx: TenantTransaction, tenantId: string, userId: string | undefined, branchId: string) {
  if (!userId) return;
  const user = await tx.user.findFirst({
    where: { tenantId, id: userId, status: "ACTIVE", OR: [{ hasAllBranches: true }, { branchAccesses: { some: { branchId } } }] },
    select: { id: true },
  });
  if (!user) invalid("O usuário selecionado não possui acesso à filial informada.");
}

export async function assertClientBranch(tx: TenantTransaction, tenantId: string, clientId: string | undefined, branchId: string) {
  if (!clientId) return;
  const client = await tx.client.findFirst({ where: { tenantId, id: clientId }, select: { primaryBranchId: true, status: true } });
  if (!client) invalid("Cliente não encontrado neste escritório. Selecione um cliente válido.");
  if (client.status === "ARCHIVED") invalid("Este cliente está arquivado e não pode ser usado em novos processos. Reative o cliente ou selecione outro.");
  if (client.primaryBranchId !== branchId) invalid("Este cliente não está vinculado à filial selecionada. Escolha outra filial, selecione um cliente compatível ou solicite o vínculo do cliente à filial.");
}

export async function assertCaseRelations(
  tx: TenantTransaction,
  tenantId: string,
  input: { caseId: string; branchId: string; legalAreaId?: string; clientId?: string },
) {
  const legalCase = await tx.legalCase.findFirst({
    where: {
      tenantId,
      id: input.caseId,
      branchId: input.branchId,
      ...(input.legalAreaId ? { legalAreaId: input.legalAreaId } : {}),
      ...(input.clientId ? { parties: { some: { clientId: input.clientId } } } : {}),
    },
    select: { id: true },
  });
  if (!legalCase) invalid("Processo, cliente, área e filial não possuem um vínculo consistente.");
}
