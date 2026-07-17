// Rótulos PT para tipos de prazo — audiência identificável por texto, sem depender
// só de cor (acessibilidade e clareza operacional).
export const DEADLINE_TYPE_LABELS: Record<string, string> = {
  PETICAO_INICIAL: "Petição inicial",
  AUDIENCIA: "Audiência",
  RECURSO: "Recurso",
  MANIFESTACAO: "Manifestação",
  ADMINISTRATIVO: "Administrativo",
  OUTRO: "Outro",
};

export const deadlineTypeLabel = (type?: string) =>
  type ? (DEADLINE_TYPE_LABELS[type] ?? type.replaceAll("_", " ")) : "";
