import { describe, expect, it } from "vitest";
import {
  deadlineInternalState,
  internalDaysDelta,
  internalDueAt,
} from "@chronostek/contracts";

// Prazo final às 12:00 de São Paulo (evita ambiguidade de meia-noite/fuso nos testes).
const due = new Date("2026-08-20T12:00:00-03:00");
const daysFromDue = (n: number) => new Date(due.getTime() + n * 86_400_000);

describe("#12 prazo interno (antecedência de 2 dias)", () => {
  it("interno = final − 2 dias (20/08 → 18/08)", () => {
    expect(internalDueAt(due).toISOString()).toBe(daysFromDue(-2).toISOString());
  });

  it("bem antes do interno → dentro do prazo interno", () => {
    expect(deadlineInternalState(due, "PENDING", daysFromDue(-30))).toBe("WITHIN_INTERNAL");
  });

  it("chegando no interno → próximo do prazo interno", () => {
    expect(deadlineInternalState(due, "PENDING", daysFromDue(-3))).toBe("NEAR_INTERNAL");
  });

  it("entre o interno e o final → interno ultrapassado", () => {
    expect(deadlineInternalState(due, "PENDING", daysFromDue(-1))).toBe("INTERNAL_OVERDUE");
  });

  it("depois do final → prazo final vencido", () => {
    expect(deadlineInternalState(due, "PENDING", daysFromDue(1))).toBe("FINAL_OVERDUE");
  });

  it("concluído antes do interno → dentro da antecedência", () => {
    expect(deadlineInternalState(due, "COMPLETED", daysFromDue(0), daysFromDue(-5))).toBe("COMPLETED_ON_TIME");
  });

  it("concluído após o interno → fora da antecedência", () => {
    expect(deadlineInternalState(due, "COMPLETED", daysFromDue(0), due)).toBe("COMPLETED_LATE");
  });

  it("cancelado é sinalizado como cancelado", () => {
    expect(deadlineInternalState(due, "CANCELLED", daysFromDue(-10))).toBe("CANCELLED");
  });

  it("delta positivo = dias de antecedência; negativo = atraso interno", () => {
    expect(internalDaysDelta(due, daysFromDue(-5))).toBe(3); // interno 18/08, concluído 15/08 → 3 antes
    expect(internalDaysDelta(due, due)).toBe(-2); // concluído no final → 2 dias após o interno
  });
});
