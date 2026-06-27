import { z } from "zod";

const optionalText = z.string().trim().max(5000).optional().or(z.literal("").transform(() => undefined));
const optionalUuid = z.string().uuid().optional().or(z.literal("").transform(() => undefined));
const optionalDate = z.coerce.date().optional().or(z.literal("").transform(() => undefined));

// #1 — Campos de data sem horário. Aceita "yyyy-mm-dd" (data pura) e a interpreta
// como meia-noite em America/Sao_Paulo (offset fixo -03:00; o Brasil não adota
// horário de verão), evitando o "erro de um dia" ao gravar em Timestamptz. Também
// aceita datetime completo, preservando compatibilidade com dados já existentes.
function spDatePreprocess(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return new Date(`${trimmed}T00:00:00-03:00`);
    return trimmed;
  }
  return value;
}
const inputDate = z.preprocess(spDatePreprocess, z.coerce.date());
const optionalInputDate = z.preprocess(spDatePreprocess, z.coerce.date().optional());

// Enum opcional que trata string vazia (filtro "sem seleção" enviado pelo frontend)
// como ausência de filtro, evitando 422 em listagens. Defesa no backend/schema,
// independente do comportamento do frontend.
export function optionalEnum<const T extends readonly [string, ...string[]]>(values: T) {
  return z.enum(values).optional().or(z.literal("").transform(() => undefined));
}

// Canais de origem do atendimento (#2). Lista fechada: novos registros usam apenas
// estes valores. Registros históricos com texto livre continuam sendo exibidos
// normalmente (a validação só incide sobre gravações).
export const ATTENDANCE_ORIGINS = ["WhatsApp", "Site", "Indicação", "Presencial", "Instagram"] as const;

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional(),
  branchId: optionalUuid,
  legalAreaId: optionalUuid,
  responsibleId: optionalUuid,
  status: z.string().trim().max(80).optional(),
  from: optionalDate,
  to: optionalDate,
});

export const clientCreateSchema = z.object({
  primaryBranchId: z.string().uuid(),
  responsibleUserId: optionalUuid,
  type: z.enum(["INDIVIDUAL", "COMPANY"]).default("INDIVIDUAL"),
  name: z.string().trim().min(3).max(200),
  email: z.string().trim().email().max(254).optional().or(z.literal("").transform(() => undefined)),
  phone: optionalText,
  taxId: optionalText,
  identity: optionalText,
  birthDate: z.coerce.date().optional(),
  address: z.record(z.string()).optional(),
  notes: optionalText,
});

export const clientUpdateSchema = clientCreateSchema.partial().extend({
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
});

export const attendanceCreateSchema = z.object({
  branchId: z.string().uuid(),
  legalAreaId: optionalUuid,
  attorneyId: optionalUuid,
  clientId: optionalUuid,
  clientName: z.string().trim().min(3).max(200),
  phone: optionalText,
  email: z.string().trim().email().optional().or(z.literal("").transform(() => undefined)),
  occurredAt: inputDate,
  origin: optionalEnum(ATTENDANCE_ORIGINS),
  notes: optionalText,
  status: z.enum(["NOVO", "EM_TRIAGEM", "AGUARDANDO_DOCUMENTOS", "DIRECIONADO", "CONVERTIDO_EM_PROCESSO", "ENCERRADO"]).default("NOVO"),
});

export const attendanceUpdateSchema = attendanceCreateSchema.partial();

export const caseCreateSchema = z.object({
  branchId: z.string().uuid(),
  legalAreaId: z.string().uuid(),
  clientId: z.string().uuid(),
  caseType: z.string().trim().min(2).max(160),
  responsibleUserId: optionalUuid,
  attorneyId: optionalUuid,
  entryDate: z.coerce.date(),
  notes: optionalText,
});

export const caseUpdateSchema = z.object({
  status: z.enum(["EM_ANALISE", "AGUARDANDO_DOCUMENTOS", "AGUARDANDO_CONTRATO", "AGUARDANDO_PAGAMENTO", "PETICAO_INICIAL", "PRONTO_PARA_DISTRIBUICAO", "DISTRIBUIDO", "EM_ANDAMENTO", "FINALIZADO", "ARQUIVADO"]).optional(),
  lastProgress: optionalText,
  notes: optionalText,
  processNumber: optionalText,
  distributionDate: z.coerce.date().optional(),
  entryDate: z.coerce.date().optional(),
  initialPetitionDueAt: optionalInputDate,
  hearingAt: optionalInputDate,
  appealDueAt: optionalInputDate,
  responsibleUserId: optionalUuid,
  attorneyId: optionalUuid,
});

export const deadlineCreateSchema = z.object({
  branchId: z.string().uuid(),
  caseId: z.string().uuid(),
  clientId: z.string().uuid(),
  legalAreaId: z.string().uuid(),
  responsibleUserId: z.string().uuid(),
  title: z.string().trim().min(3).max(200),
  type: z.enum(["PETICAO_INICIAL", "AUDIENCIA", "RECURSO", "MANIFESTACAO", "ADMINISTRATIVO", "OUTRO"]),
  dueAt: inputDate,
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  notes: optionalText,
});

export const deadlineUpdateSchema = deadlineCreateSchema.partial().extend({
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
});

export const deadlineStatusSchema = z.object({ status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]) });

export const feeContractCreateSchema = z.object({
  branchId: z.string().uuid(),
  clientId: z.string().uuid(),
  caseId: optionalUuid,
  feeAmount: z.coerce.number().positive().max(999999999),
  costAmount: z.coerce.number().min(0).max(999999999).default(0),
  paymentMethod: z.enum(["CASH", "PIX", "BANK_TRANSFER", "CREDIT_CARD", "DEBIT_CARD", "BOLETO_MANUAL", "OTHER"]),
  paymentTiming: z.enum(["UPFRONT", "END_OF_CASE", "INSTALLMENTS"]),
  installmentCount: z.coerce.number().int().min(1).max(120).default(1),
  firstDueDate: z.coerce.date(),
  notes: optionalText,
});

export const feeContractUpdateSchema = z.object({
  paymentMethod: z.enum(["CASH", "PIX", "BANK_TRANSFER", "CREDIT_CARD", "DEBIT_CARD", "BOLETO_MANUAL", "OTHER"]).optional(),
  paymentTiming: z.enum(["UPFRONT", "END_OF_CASE", "INSTALLMENTS"]).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
  signedAt: z.coerce.date().optional(),
  notes: optionalText,
});

export const collectionNoteSchema = z.object({
  installmentId: optionalUuid,
  note: z.string().trim().min(3).max(5000),
});

export const paymentSchema = z.object({ paidAt: z.coerce.date().default(() => new Date()), notes: optionalText });

export const legalAreaCreateSchema = z.object({ name: z.string().trim().min(2).max(120), description: optionalText });
export const branchCreateSchema = z.object({
  name: z.string().trim().min(2).max(160),
  code: z.string().trim().min(2).max(30).transform((value) => value.toUpperCase()),
  email: z.string().email().optional().or(z.literal("").transform(() => undefined)),
  phone: optionalText,
});
export const branchUpdateSchema = branchCreateSchema.partial().extend({ isActive: z.boolean().optional() });
export const userCreateSchema = z.object({
  name: z.string().trim().min(3).max(160),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  roleCode: z.enum(["ADMIN_GERAL", "GESTOR_FILIAL", "SECRETARIA", "ADVOGADO", "FINANCEIRO", "VISUALIZADOR"]),
  branchIds: z.preprocess((value) => typeof value === "string" ? [value] : value, z.array(z.string().uuid()).default([])),
  hasAllBranches: z.boolean().default(false),
  temporaryPassword: z.string().min(12).max(128),
});
export const userUpdateSchema = z.object({
  name: z.string().trim().min(3).max(160).optional(),
  email: z.string().trim().email().transform((value) => value.toLowerCase()).optional(),
  roleCode: z.enum(["ADMIN_GERAL", "GESTOR_FILIAL", "SECRETARIA", "ADVOGADO", "FINANCEIRO", "VISUALIZADOR"]).optional(),
  branchIds: z.array(z.string().uuid()).optional(),
  hasAllBranches: z.boolean().optional(),
  status: z.enum(["INVITED", "ACTIVE", "SUSPENDED", "ARCHIVED"]).optional(),
});
export const passwordResetSchema = z.object({ temporaryPassword: z.string().min(12).max(128) });
export const legalAreaUpdateSchema = legalAreaCreateSchema.partial().extend({ isActive: z.boolean().optional() });
export const tenantSettingsSchema = z.object({
  tradeName: z.string().trim().min(2).max(200),
  contactEmail: z.string().email().optional().or(z.literal("").transform(() => undefined)),
  contactPhone: optionalText,
  website: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});
