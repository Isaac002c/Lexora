import { createHash, randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { AppError } from "../../lib/app-error.js";

const mimeExtensions: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

function storageRoot() {
  return path.resolve(process.env.STORAGE_LOCAL_PATH ?? "./storage/uploads");
}

export function validateUpload(file: Express.Multer.File) {
  const extension = mimeExtensions[file.mimetype];
  if (!extension) throw new AppError(422, "Arquivo não permitido", "Envie PDF, Word, JPEG, PNG ou WebP.");
  return extension;
}

export async function saveLocalFile(tenantId: string, file: Express.Multer.File) {
  const extension = validateUpload(file);
  const date = new Date();
  const objectKey = `${tenantId}/${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}${extension}`;
  const absolutePath = path.resolve(storageRoot(), objectKey);
  if (!absolutePath.startsWith(`${storageRoot()}${path.sep}`)) throw new Error("Caminho de armazenamento inválido.");
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, file.buffer, { flag: "wx" });
  return { objectKey, absolutePath, checksum: createHash("sha256").update(file.buffer).digest("hex") };
}

export async function removeLocalFile(absolutePath: string) {
  await unlink(absolutePath).catch(() => undefined);
}

export function resolveStoredFile(objectKey: string) {
  const absolutePath = path.resolve(storageRoot(), objectKey);
  if (!absolutePath.startsWith(`${storageRoot()}${path.sep}`)) throw new Error("Caminho de armazenamento inválido.");
  return absolutePath;
}
