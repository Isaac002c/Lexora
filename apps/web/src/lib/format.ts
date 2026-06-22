export const formatDate = (value: string | Date | null | undefined, withTime = false) =>
  value ? new Intl.DateTimeFormat("pt-BR", withTime ? { dateStyle: "short", timeStyle: "short" } : { dateStyle: "short" }).format(new Date(value)) : "—";

export const formatMoney = (value: string | number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));
