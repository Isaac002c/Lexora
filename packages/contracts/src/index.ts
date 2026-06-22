import { z } from "zod";

export const apiErrorSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  requestId: z.string().optional(),
  errors: z.record(z.array(z.string())).optional(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export const loginSchema = z.object({
  tenantSlug: z.string().trim().min(2).max(80).transform((value) => value.toLowerCase()),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8).max(128),
    newPassword: z
      .string()
      .min(12, "A nova senha deve ter ao menos 12 caracteres.")
      .max(128)
      .regex(/[a-z]/, "Inclua uma letra minúscula.")
      .regex(/[A-Z]/, "Inclua uma letra maiúscula.")
      .regex(/\d/, "Inclua um número.")
      .regex(/[^A-Za-z0-9]/, "Inclua um caractere especial."),
    confirmation: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmation, {
    message: "As senhas não coincidem.",
    path: ["confirmation"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export * from "./domain.js";
export * from "./integrations.js";
