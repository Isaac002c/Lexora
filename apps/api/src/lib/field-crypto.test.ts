import { beforeAll, describe, expect, it } from "vitest";
import { encryptField, normalizeSearch, normalizeTaxId, taxIdHash } from "./field-crypto.js";

beforeAll(() => { process.env.FIELD_ENCRYPTION_KEY = "test-only-key-with-at-least-32-characters"; });

describe("sensitive field protection", () => {
  it("normalizes Brazilian documents", () => expect(normalizeTaxId("123.456.789-09")).toBe("12345678909"));
  it("uses tenant-separated search hashes", () => expect(taxIdHash("tenant-a", "12345678909")).not.toBe(taxIdHash("tenant-b", "12345678909")));
  it("does not leave plaintext in encrypted output", () => expect(encryptField("12345678909")).not.toContain("12345678909"));
  it("normalizes accents for searches", () => expect(normalizeSearch("  João D'Ávila ")).toBe("joao d'avila"));
});
