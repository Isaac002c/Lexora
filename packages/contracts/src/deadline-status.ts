// #12 — Prazo interno (antecedência mínima). Regra do escritório: o prazo interno de
// conclusão é 2 dias antes do prazo FINAL oficial. Apenas o prazo final representa o
// vencimento jurídico. Funções puras e determinísticas — a MESMA regra roda no backend
// (auditoria/serviços) e no frontend (exibição), sem duplicação nem divergência.
export const INTERNAL_ANTECEDENCE_DAYS = 2;
const DAY_MS = 86_400_000;

const asDate = (value: Date | string): Date => (typeof value === "string" ? new Date(value) : value);
const startOfDay = (t: number): number => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** Prazo interno = prazo final − 2 dias (ex.: final 20/08 → interno 18/08). */
export function internalDueAt(dueAt: Date | string): Date {
  return new Date(asDate(dueAt).getTime() - INTERNAL_ANTECEDENCE_DAYS * DAY_MS);
}

export type DeadlineInternalState =
  | "WITHIN_INTERNAL"
  | "NEAR_INTERNAL"
  | "INTERNAL_REACHED"
  | "INTERNAL_OVERDUE"
  | "FINAL_OVERDUE"
  | "COMPLETED_ON_TIME"
  | "COMPLETED_LATE"
  | "CANCELLED";

export const INTERNAL_STATE_LABELS: Record<DeadlineInternalState, string> = {
  WITHIN_INTERNAL: "Dentro do prazo interno",
  NEAR_INTERNAL: "Próximo do prazo interno",
  INTERNAL_REACHED: "Prazo interno é hoje",
  INTERNAL_OVERDUE: "Prazo interno ultrapassado",
  FINAL_OVERDUE: "Prazo final vencido",
  COMPLETED_ON_TIME: "Concluído na antecedência",
  COMPLETED_LATE: "Concluído fora da antecedência",
  CANCELLED: "Cancelado",
};

/** Estado do prazo em relação ao prazo interno e ao final (granularidade de dia). */
export function deadlineInternalState(
  dueAt: Date | string,
  status: string,
  now: Date = new Date(),
  completedAt?: Date | string | null,
): DeadlineInternalState {
  if (status === "CANCELLED") return "CANCELLED";
  const due = asDate(dueAt);
  const internal = internalDueAt(due);
  if (status === "COMPLETED") {
    const ref = completedAt ? asDate(completedAt) : now;
    return startOfDay(ref.getTime()) <= startOfDay(internal.getTime()) ? "COMPLETED_ON_TIME" : "COMPLETED_LATE";
  }
  const nowDay = startOfDay(now.getTime());
  const dueDay = startOfDay(due.getTime());
  const internalDay = startOfDay(internal.getTime());
  if (nowDay > dueDay) return "FINAL_OVERDUE";
  if (nowDay > internalDay) return "INTERNAL_OVERDUE";
  const daysToInternal = Math.round((internalDay - nowDay) / DAY_MS);
  if (daysToInternal <= 0) return "INTERNAL_REACHED";
  if (daysToInternal <= INTERNAL_ANTECEDENCE_DAYS) return "NEAR_INTERNAL";
  return "WITHIN_INTERNAL";
}

/** Dias de antecedência (positivo) ou de atraso interno (negativo) na conclusão. */
export function internalDaysDelta(dueAt: Date | string, completedAt: Date | string): number {
  return Math.round((startOfDay(internalDueAt(dueAt).getTime()) - startOfDay(asDate(completedAt).getTime())) / DAY_MS);
}
