import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  outDir: "dist",
  sourcemap: true,
  clean: true,
  noExternal: ["@chronostek/auth", "@chronostek/config", "@chronostek/contracts", "@chronostek/database"],
  external: ["@prisma/client"],
});
