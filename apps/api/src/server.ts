import { parseServerEnv } from "@chronostek/config";
import { createApp } from "./app.js";
import { prisma } from "@chronostek/database";
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

for (const candidate of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../..", ".env")]) {
  if (existsSync(candidate)) {
    loadEnv({ path: candidate });
    break;
  }
}

const env = parseServerEnv(process.env);
const app = createApp(env.WEB_URL);

const server = app.listen(env.API_PORT, () => {
  console.info(`Chronostek API listening on port ${env.API_PORT}`);
});

async function shutdown(signal: string) {
  console.info(`${signal} received, shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
