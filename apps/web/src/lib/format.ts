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

export const formatMoney = (value: string | number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));
