import { Badge } from "./ui/badge";

const danger = ["VENCIDO", "DARK_RED", "RECUSADO", "REJECTED"];
const warning = ["AGUARDANDO_DOCUMENTOS", "AGUARDANDO_CONTRATO", "AGUARDANDO_PAGAMENTO", "YELLOW", "PENDING", "PENDING_APPROVAL", "PENDENTE", "A_VENCER"];
const success = ["ACTIVE", "PAGO", "PAID", "COMPLETED", "FINALIZADO", "RECEBIDO", "ANALISADO", "GREEN", "APPROVED", "EM_DIA"];
const orange = ["INADIMPLENTE_15_DIAS"];

// Rótulos legíveis em PT-BR para os códigos técnicos exibidos nos badges.
// A cor (variant) continua derivada do código original; aqui só traduzimos o texto.
// A regra do MVP exige que o prazo vencido apareça claramente como "Vencido".
const labels: Record<string, string> = {
  // Indicador de cor de prazo
  GREEN: "No prazo", YELLOW: "Atenção", RED: "Crítico", DARK_RED: "Vencido", GRAY: "Encerrado",
  // Status genéricos (usuário, cliente, contrato, prazo, documento, parcela)
  ACTIVE: "Ativo", INACTIVE: "Inativo", INVITED: "Convidado", SUSPENDED: "Suspenso", ARCHIVED: "Arquivado",
  PENDING: "Pendente", PENDING_APPROVAL: "Aguardando aprovação", IN_PROGRESS: "Em andamento", COMPLETED: "Concluído", CANCELLED: "Cancelado",
  RECEIVED: "Recebido", UNDER_REVIEW: "Em análise", APPROVED: "Aprovado", REJECTED: "Recusado",
  DRAFT: "Rascunho", PAID: "Pago",
  // Atendimento
  NOVO: "Novo", EM_TRIAGEM: "Em triagem", AGUARDANDO_DOCUMENTOS: "Aguardando documentos",
  DIRECIONADO: "Direcionado", CONVERTIDO_EM_PROCESSO: "Convertido em processo", ENCERRADO: "Encerrado",
  // Processo
  EM_ANALISE: "Em análise", AGUARDANDO_CONTRATO: "Aguardando contrato", AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PETICAO_INICIAL: "Petição inicial", PRONTO_PARA_DISTRIBUICAO: "Pronto para distribuição",
  DISTRIBUIDO: "Distribuído", EM_ANDAMENTO: "Em andamento", FINALIZADO: "Finalizado", ARQUIVADO: "Arquivado",
  // Checklist
  PENDENTE: "Pendente", RECEBIDO: "Recebido", ANALISADO: "Analisado", RECUSADO: "Recusado", NAO_SE_APLICA: "Não se aplica",
  // Inadimplência (envelhecimento de parcela)
  EM_DIA: "Em dia", A_VENCER: "A vencer", VENCIDO: "Vencido", INADIMPLENTE_15_DIAS: "Inadimplente +15 dias",
  PAGO: "Pago", CANCELADO: "Cancelado",
};

export function StatusBadge({ value }: { value: string }) {
  const variant = danger.includes(value) || value === "RED" ? "danger" : orange.includes(value) ? "orange" : warning.includes(value) ? "warning" : success.includes(value) ? "success" : ["GRAY", "ARCHIVED", "ARQUIVADO", "CANCELLED"].includes(value) ? "muted" : "default";
  return <Badge variant={variant}>{labels[value] ?? value.replaceAll("_", " ")}</Badge>;
}
