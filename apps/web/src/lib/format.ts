const TIMEZONE = "America/Sao_Paulo";

// Datas puras (`@db.Date`) chegam como meia-noite UTC: formatá-las em UTC
// preserva o dia armazenado e evita o "erro de um dia". Datas com hora
// (`Timestamptz`) são instantes reais e são exibidas no fuso de São Paulo.
export const formatDate = (value: string | Date | null | undefined, withTime = false) =>
  value
    ? new Intl.DateTimeFormat(
        "pt-BR",
        withTime
          ? { dateStyle: "short", timeStyle: "short", timeZone: TIMEZONE }
          : { dateStyle: "short", timeZone: "UTC" },
      ).format(new Date(value))
    : "—";

// #1 — Campos Timestamptz tratados como DATA: exibe somente a data no fuso de São
// Paulo, correto para registros novos (meia-noite SP) e antigos (instante real).
export const formatDay = (value: string | Date | null | undefined) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: TIMEZONE }).format(new Date(value))
    : "—";

export const formatTime = (value: string | Date | null | undefined) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: TIMEZONE,
      }).format(new Date(value))
    : "—";

export const formatDateTimeInput = (value: string | Date | null | undefined) => {
  if (!value) return "";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: TIMEZONE,
    })
      .formatToParts(new Date(value))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

export const formatMoney = (value: string | number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));
