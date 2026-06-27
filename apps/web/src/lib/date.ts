// #1 — Converte entrada de data para ISO "yyyy-mm-dd".
// Aceita dd/mm/aaaa, ddmmaaaa e yyyy-mm-dd (já normalizado). Retorna null se inválida.
export function parseDateInput(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  let year: number;
  let month: number;
  let day: number;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  const digits = /^(\d{2})(\d{2})(\d{4})$/.exec(value);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (br) {
    day = Number(br[1]);
    month = Number(br[2]);
    year = Number(br[3]);
  } else if (digits) {
    day = Number(digits[1]);
    month = Number(digits[2]);
    year = Number(digits[3]);
  } else if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else {
    return null;
  }
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const normalized = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  // Rejeita datas impossíveis (ex.: 31/02) comparando os componentes em UTC.
  const check = new Date(`${normalized}T00:00:00Z`);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() + 1 !== month || check.getUTCDate() !== day) return null;
  return normalized;
}
