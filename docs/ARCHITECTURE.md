# Arquitetura Chronostek

O workspace contém `apps/web` (Next.js/BFF), `apps/api` (Express e regras de negócio), `packages/database` (Prisma), `packages/contracts` (Zod/DTOs), `packages/auth` (RBAC) e `packages/config` (ambiente).

O token opaco fica em cookie HttpOnly no domínio web. O BFF o encaminha à API; a API resolve usuário, tenant, papéis e filiais. Toda consulta operacional combina filtro explícito com RLS no PostgreSQL. Operações e auditoria compartilham a mesma transação.

Arquivos usam um adapter de storage e metadados tenant-scoped. O MVP usa volume local privado; S3 poderá substituir o driver. Contratos de interfaces futuras para pagamento, WhatsApp, e-mail, assinatura e tribunais existem sem integração ativa.
