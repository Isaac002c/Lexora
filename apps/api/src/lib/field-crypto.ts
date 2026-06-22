import { createCipheriv, createHmac, createHash, randomBytes } from "node:crypto";

function key() {
  const secret = process.env.FIELD_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) throw new Error("FIELD_ENCRYPTION_KEY must have at least 32 characters");
  return createHash("sha256").update(secret).digest();
}

export function normalizeTaxId(value: string) {
  return value.replace(/\D/g, "");
}

export function taxIdHash(tenantId: string, value: string) {
  return createHmac("sha256", key()).update(`${tenantId}:${normalizeTaxId(value)}`).digest("hex");
}

export function encryptField(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
