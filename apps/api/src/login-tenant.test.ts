import { describe, expect, it } from "vitest";
import { loginSchema } from "@chronostek/contracts";

// O escritório (tenant) deixa de ser digitado pelo usuário: é resolvido pelo e-mail
// no backend. O campo segue aceito (opcional) para compatibilidade e desambiguação.
describe("login sem escolha manual de escritório", () => {
  it("aceita login apenas com e-mail e senha", () => {
    const parsed = loginSchema.parse({ email: "Pessoa@Escritorio.com.br", password: "senha-forte-123" });
    expect(parsed.tenantSlug).toBeUndefined();
    expect(parsed.email).toBe("pessoa@escritorio.com.br"); // normalizado
  });

  it("trata escritório vazio como ausente (formulário sem o campo)", () => {
    const parsed = loginSchema.parse({ tenantSlug: "", email: "a@b.com", password: "senha-forte-123" });
    expect(parsed.tenantSlug).toBeUndefined();
  });

  it("ainda aceita o escritório informado, em minúsculas (desambiguação)", () => {
    const parsed = loginSchema.parse({ tenantSlug: "MeuEscritorio", email: "a@b.com", password: "senha-forte-123" });
    expect(parsed.tenantSlug).toBe("meuescritorio");
  });

  it("continua exigindo e-mail válido e senha", () => {
    expect(() => loginSchema.parse({ email: "sem-arroba", password: "senha-forte-123" })).toThrow();
    expect(() => loginSchema.parse({ email: "a@b.com", password: "curta" })).toThrow();
  });
});
