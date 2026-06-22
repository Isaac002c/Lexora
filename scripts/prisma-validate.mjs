import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(command, ["--filter", "@chronostek/database", "exec", "prisma", "validate"], {
  cwd: root,
  env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://validation:validation@127.0.0.1:5432/validation" },
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (result.error) console.error(result.error);
process.exit(result.status ?? 1);
