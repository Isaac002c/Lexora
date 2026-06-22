import { Badge } from "./ui/badge";

const danger = ["VENCIDO", "DARK_RED", "RECUSADO", "REJECTED"];
const warning = ["AGUARDANDO_DOCUMENTOS", "AGUARDANDO_CONTRATO", "AGUARDANDO_PAGAMENTO", "YELLOW", "PENDING", "PENDENTE", "A_VENCER"];
const success = ["ACTIVE", "PAGO", "PAID", "COMPLETED", "FINALIZADO", "RECEBIDO", "ANALISADO", "GREEN", "APPROVED"];
const orange = ["INADIMPLENTE_15_DIAS"];

export function StatusBadge({ value }: { value: string }) {
  const variant = danger.includes(value) || value === "RED" ? "danger" : orange.includes(value) ? "orange" : warning.includes(value) ? "warning" : success.includes(value) ? "success" : ["GRAY", "ARCHIVED", "ARQUIVADO", "CANCELLED"].includes(value) ? "muted" : "default";
  return <Badge variant={variant}>{value.replaceAll("_", " ")}</Badge>;
}
