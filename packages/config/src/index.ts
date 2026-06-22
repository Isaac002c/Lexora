import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(3333),
  WEB_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  FIELD_ENCRYPTION_KEY: z.string().min(32),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_LOCAL_PATH: z.string().default("./storage/uploads"),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().positive().max(100).default(20),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(input: NodeJS.ProcessEnv): ServerEnv {
  return serverEnvSchema.parse(input);
}
