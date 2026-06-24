import { describe, expect, it } from "vitest";
import { listQuerySchema, optionalEnum } from "@chronostek/contracts";
import { deadlineQuerySchema } from "./modules/deadlines/deadlines.routes.js";

// Endurecimento de validação de query: filtros opcionais enviados como string vazia
// pelo frontend ("sem seleção") devem ser tratados como ausência de filtro, e não
// causar 422. A defesa fica no backend/schema, independente do frontend.

describe("optionalEnum", () => {
  const schema = optionalEnum(["a", "b"]);
  it("trata string vazia como undefined", () => {
    expect(schema.parse("")).toBeUndefined();
  });
  it("aceita valor válido do enum", () => {
    expect(schema.parse("a")).toBe("a");
  });
  it("aceita undefined", () => {
    expect(schema.parse(undefined)).toBeUndefined();
  });
  it("rejeita valor inválido", () => {
    expect(() => schema.parse("x")).toThrow();
  });
});

describe("listQuerySchema — filtros vazios", () => {
  it("converte branchId/from/to vazios em undefined e aplica defaults", () => {
    const parsed = listQuerySchema.parse({ branchId: "", from: "", to: "" });
    expect(parsed.branchId).toBeUndefined();
    expect(parsed.from).toBeUndefined();
    expect(parsed.to).toBeUndefined();
    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(20);
  });
  it("aceita data válida em from", () => {
    expect(listQuerySchema.parse({ from: "2026-06-01" }).from).toBeInstanceOf(Date);
  });
  it("rejeita pageSize acima do limite", () => {
    expect(() => listQuerySchema.parse({ pageSize: "9999" })).toThrow();
  });
});

describe("deadlineQuerySchema (endurecido)", () => {
  it("trata view/type vazios como undefined (sem 422)", () => {
    const parsed = deadlineQuerySchema.parse({ view: "", type: "" });
    expect(parsed.view).toBeUndefined();
    expect(parsed.type).toBeUndefined();
  });
  it("aceita view válido", () => {
    expect(deadlineQuerySchema.parse({ view: "overdue" }).view).toBe("overdue");
  });
  it("rejeita view inválido", () => {
    expect(() => deadlineQuerySchema.parse({ view: "bogus" })).toThrow();
  });
});
