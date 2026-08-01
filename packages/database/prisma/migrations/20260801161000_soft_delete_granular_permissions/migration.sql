-- Reversible logical deletion for operational and financial records.
ALTER TABLE "clients"
  ADD COLUMN "deleted_at" TIMESTAMPTZ(3),
  ADD COLUMN "deleted_by_id" UUID,
  ADD COLUMN "deletion_reason" TEXT;

ALTER TABLE "attendances"
  ADD COLUMN "deleted_at" TIMESTAMPTZ(3),
  ADD COLUMN "deleted_by_id" UUID,
  ADD COLUMN "deletion_reason" TEXT;

ALTER TABLE "legal_cases"
  ADD COLUMN "deleted_at" TIMESTAMPTZ(3),
  ADD COLUMN "deleted_by_id" UUID,
  ADD COLUMN "deletion_reason" TEXT;

ALTER TABLE "deadlines"
  ADD COLUMN "deleted_at" TIMESTAMPTZ(3),
  ADD COLUMN "deleted_by_id" UUID,
  ADD COLUMN "deletion_reason" TEXT;

ALTER TABLE "documents"
  ADD COLUMN "deleted_at" TIMESTAMPTZ(3),
  ADD COLUMN "deleted_by_id" UUID,
  ADD COLUMN "deletion_reason" TEXT;

ALTER TABLE "fee_contracts"
  ADD COLUMN "deleted_at" TIMESTAMPTZ(3),
  ADD COLUMN "deleted_by_id" UUID,
  ADD COLUMN "deletion_reason" TEXT;

ALTER TABLE "payment_installments"
  ADD COLUMN "deleted_at" TIMESTAMPTZ(3),
  ADD COLUMN "deleted_by_id" UUID,
  ADD COLUMN "deletion_reason" TEXT;

CREATE INDEX "clients_tenant_id_deleted_at_idx" ON "clients"("tenant_id", "deleted_at");
CREATE INDEX "attendances_tenant_id_deleted_at_idx" ON "attendances"("tenant_id", "deleted_at");
CREATE INDEX "legal_cases_tenant_id_deleted_at_idx" ON "legal_cases"("tenant_id", "deleted_at");
CREATE INDEX "deadlines_tenant_id_deleted_at_idx" ON "deadlines"("tenant_id", "deleted_at");
CREATE INDEX "documents_tenant_id_deleted_at_idx" ON "documents"("tenant_id", "deleted_at");
CREATE INDEX "fee_contracts_tenant_id_deleted_at_idx" ON "fee_contracts"("tenant_id", "deleted_at");
CREATE INDEX "payment_installments_tenant_id_deleted_at_idx" ON "payment_installments"("tenant_id", "deleted_at");

-- Permissions are tenant-scoped; add them to every existing tenant idempotently.
-- Keep least-privilege defaults while giving system roles the capabilities
-- appropriate to their operating area. Custom roles remain unchanged. The
-- tenant context is set per iteration because these tables have FORCE RLS.
DO $$
DECLARE
  tenant_record record;
BEGIN
  FOR tenant_record IN SELECT "id" FROM "tenants" LOOP
    PERFORM set_config('app.tenant_id', tenant_record."id"::text, true);

    INSERT INTO "permissions" ("id", "tenant_id", "code", "description")
    SELECT gen_random_uuid(), tenant_record."id", code, code
    FROM (VALUES
      ('client.delete'), ('client.restore'), ('client.export'), ('client.history'),
      ('attendance.delete'), ('attendance.restore'), ('attendance.export'), ('attendance.history'),
      ('case.delete'), ('case.restore'), ('case.export'), ('case.history'),
      ('deadline.delete'), ('deadline.restore'), ('deadline.export'), ('deadline.history'),
      ('document.delete'), ('document.restore'), ('document.history'),
      ('finance.export'), ('finance.history'), ('audit.export')
    ) AS new_permissions(code)
    ON CONFLICT ("tenant_id", "code") DO NOTHING;

    INSERT INTO "role_permissions" ("tenant_id", "role_id", "permission_id")
    SELECT role."tenant_id", role."id", permission."id"
    FROM "roles" role
    JOIN "permissions" permission ON permission."tenant_id" = role."tenant_id"
    WHERE role."tenant_id" = tenant_record."id"
      AND permission."code" IN (
        'client.delete', 'client.restore', 'client.export', 'client.history',
        'attendance.delete', 'attendance.restore', 'attendance.export', 'attendance.history',
        'case.delete', 'case.restore', 'case.export', 'case.history',
        'deadline.delete', 'deadline.restore', 'deadline.export', 'deadline.history',
        'document.delete', 'document.restore', 'document.history',
        'finance.export', 'finance.history', 'audit.export'
      )
      AND (
        role."code" = 'ADMIN_GERAL'
        OR role."code" = 'GESTOR_FILIAL'
        OR (role."code" = 'SECRETARIA' AND permission."code" IN (
          'client.delete', 'client.restore', 'client.export', 'client.history',
          'attendance.delete', 'attendance.restore', 'attendance.export', 'attendance.history',
          'case.history', 'document.delete', 'document.restore', 'document.history'
        ))
        OR (role."code" = 'ADVOGADO' AND permission."code" IN (
          'client.history', 'case.delete', 'case.restore', 'case.export', 'case.history',
          'deadline.delete', 'deadline.restore', 'deadline.export', 'deadline.history',
          'document.delete', 'document.restore', 'document.history'
        ))
        OR (role."code" = 'FINANCEIRO' AND permission."code" IN (
          'client.history', 'case.history', 'document.delete', 'document.restore',
          'document.history', 'finance.export', 'finance.history'
        ))
        OR (role."code" = 'VISUALIZADOR' AND permission."code" IN (
          'client.export', 'client.history', 'attendance.export', 'attendance.history',
          'case.export', 'case.history', 'deadline.export', 'deadline.history',
          'document.history', 'finance.export', 'finance.history'
        ))
      )
    ON CONFLICT ("tenant_id", "role_id", "permission_id") DO NOTHING;
  END LOOP;
END $$;
