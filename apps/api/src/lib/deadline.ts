import type { DeadlineStatus } from "@chronostek/database";

export type DeadlineColor = "GREEN" | "YELLOW" | "RED" | "GRAY" | "DARK_RED";

export function deadlineColor(dueAt: Date, status: DeadlineStatus, now = new Date()): DeadlineColor {
  if (status === "COMPLETED" || status === "CANCELLED") return "GRAY";
  const days = Math.ceil((dueAt.getTime() - now.getTime()) / 86_400_000);
  if (days < 0) return "DARK_RED";
  if (days <= 5) return "RED";
  if (days <= 7) return "YELLOW";
  return "GREEN";
}

export function installmentAging(dueDate: Date, status: string, now = new Date()) {
  if (status === "PAID") return "PAGO";
  if (status === "CANCELLED") return "CANCELADO";
  const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / 86_400_000);
  if (daysOverdue > 15) return "INADIMPLENTE_15_DIAS";
  if (daysOverdue > 0) return "VENCIDO";
  if (daysOverdue >= -7) return "A_VENCER";
  return "EM_DIA";
}
