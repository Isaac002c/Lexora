import { describe, expect, it } from "vitest";
import { attendanceCreateSchema, caseCreateSchema, caseDeadlineCreateSchema, deadlineCreateSchema } from "@chronostek/contracts";

const ids = {
  branchId: "11111111-1111-4111-8111-111111111111",
  caseId: "22222222-2222-4222-8222-222222222222",
  clientId: "33333333-3333-4333-8333-333333333333",
  legalAreaId: "44444444-4444-4444-8444-444444444444",
  responsibleUserId: "55555555-5555-4555-8555-555555555555",
};

describe("#1 entrada de data sem horário (America/Sao_Paulo)", () => {
  it("interpreta yyyy-mm-dd como meia-noite em São Paulo (UTC-3 => 03:00Z)", () => {
    const parsed = attendanceCreateSchema.parse({
      branchId: ids.branchId,
      clientName: "Cliente Teste",
      occurredAt: "2026-06-30",
      origin: "WhatsApp",
    });
    expect(parsed.occurredAt.toISOString()).toBe("2026-06-30T03:00:00.000Z");
  });

  it("preserva datetime completo já existente sem deslocar", () => {
    const parsed = attendanceCreateSchema.parse({
      branchId: ids.branchId,
      clientName: "Cliente Teste",
      occurredAt: "2026-06-30T14:30:00-03:00",
    });
    expect(parsed.occurredAt.toISOString()).toBe("2026-06-30T17:30:00.000Z");
  });

  it("aplica a mesma regra ao vencimento de prazo (Timestamptz tratado como data)", () => {
    const parsed = deadlineCreateSchema.parse({
      ...ids,
      title: "Prazo de teste",
      type: "OUTRO",
      dueAt: "2026-06-30",
    });
    expect(parsed.dueAt.toISOString()).toBe("2026-06-30T03:00:00.000Z");
  });

  it("aplica a regra de data ao prazo criado dentro do processo (#5)", () => {
    const parsed = caseDeadlineCreateSchema.parse({
      title: "Audiência de instrução",
      type: "AUDIENCIA",
      dueAt: "2026-07-15",
      responsibleUserId: ids.responsibleUserId,
    });
    expect(parsed.dueAt.toISOString()).toBe("2026-07-15T03:00:00.000Z");
    expect(parsed.priority).toBe("NORMAL");
  });
});

describe("#2 origem do atendimento como lista fechada", () => {
  it("aceita um canal válido da lista", () => {
    const parsed = attendanceCreateSchema.parse({
      branchId: ids.branchId,
      clientName: "Cliente Teste",
      occurredAt: "2026-06-30",
      origin: "Instagram",
    });
    expect(parsed.origin).toBe("Instagram");
  });

  it("rejeita texto livre fora da lista", () => {
    expect(() =>
      attendanceCreateSchema.parse({
        branchId: ids.branchId,
        clientName: "Cliente Teste",
        occurredAt: "2026-06-30",
        origin: "Telefone",
      }),
    ).toThrow();
  });

  it("trata origem vazia como ausência (preserva compatibilidade)", () => {
    const parsed = attendanceCreateSchema.parse({
      branchId: ids.branchId,
      clientName: "Cliente Teste",
      occurredAt: "2026-06-30",
      origin: "",
    });
    expect(parsed.origin).toBeUndefined();
  });
});

describe("#6 número do processo e parte contrária separados do tipo/categoria", () => {
  const baseCase = { branchId: ids.branchId, legalAreaId: ids.legalAreaId, clientId: ids.clientId, entryDate: "2026-08-01" };
  it("aceita número e parte contrária como campos próprios", () => {
    const parsed = caseCreateSchema.parse({ ...baseCase, caseType: "Reclamação trabalhista", processNumber: "0001234-56.2026.5.02.0001", opposingParty: "Empresa X Ltda" });
    expect(parsed.processNumber).toBe("0001234-56.2026.5.02.0001");
    expect(parsed.opposingParty).toBe("Empresa X Ltda");
    expect(parsed.caseType).toBe("Reclamação trabalhista");
  });
  it("número e parte contrária são opcionais (não confundir com o tipo)", () => {
    const parsed = caseCreateSchema.parse({ ...baseCase, caseType: "Cível" });
    expect(parsed.processNumber).toBeUndefined();
    expect(parsed.opposingParty).toBeUndefined();
  });
});
