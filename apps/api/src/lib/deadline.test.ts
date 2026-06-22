import { describe, expect, it } from "vitest";
import { deadlineColor, installmentAging } from "./deadline.js";

const now = new Date("2026-06-17T12:00:00.000Z");

describe("deadlineColor", () => {
  it.each([
    ["2026-06-30T12:00:00.000Z", "PENDING", "GREEN"],
    ["2026-06-24T12:00:00.000Z", "PENDING", "YELLOW"],
    ["2026-06-22T12:00:00.000Z", "PENDING", "RED"],
    ["2026-06-16T12:00:00.000Z", "PENDING", "DARK_RED"],
    ["2026-06-30T12:00:00.000Z", "COMPLETED", "GRAY"],
  ] as const)("maps %s/%s to %s", (dueAt, status, expected) => {
    expect(deadlineColor(new Date(dueAt), status, now)).toBe(expected);
  });
});

describe("installmentAging", () => {
  it("prioritizes terminal payment states", () => {
    expect(installmentAging(new Date("2026-01-01"), "PAID", now)).toBe("PAGO");
    expect(installmentAging(new Date("2026-01-01"), "CANCELLED", now)).toBe("CANCELADO");
  });

  it("marks more than fifteen days overdue as delinquent", () => {
    expect(installmentAging(new Date("2026-06-01T12:00:00.000Z"), "PENDING", now)).toBe("INADIMPLENTE_15_DIAS");
    expect(installmentAging(new Date("2026-06-02T12:00:00.000Z"), "PENDING", now)).toBe("VENCIDO");
  });
});
