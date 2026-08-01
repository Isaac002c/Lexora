-- Auditoria estruturada, aditiva e compatível com os eventos existentes.
-- Nenhuma coluna existente é removida e nenhuma linha é reescrita.
ALTER TABLE "tenant_settings"
  ALTER COLUMN "primary_color" SET DEFAULT '#A56FFF';

ALTER TABLE "audit_logs"
  ADD COLUMN "actor_name" TEXT,
  ADD COLUMN "actor_roles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "department_name" TEXT,
  ADD COLUMN "branch_id" UUID,
  ADD COLUMN "module" TEXT,
  ADD COLUMN "before_state" JSONB,
  ADD COLUMN "after_state" JSONB,
  ADD COLUMN "changed_fields" JSONB,
  ADD COLUMN "reason" TEXT,
  ADD COLUMN "origin" TEXT,
  ADD COLUMN "correlation_id" TEXT;

CREATE INDEX "audit_logs_tenant_id_action_created_at_idx"
  ON "audit_logs"("tenant_id", "action", "created_at");
CREATE INDEX "audit_logs_tenant_id_module_created_at_idx"
  ON "audit_logs"("tenant_id", "module", "created_at");
CREATE INDEX "audit_logs_tenant_id_correlation_id_idx"
  ON "audit_logs"("tenant_id", "correlation_id");

-- A aplicação continua podendo inserir eventos, porém nem mesmo uma rota futura
-- poderá editar/apagar o histórico por acidente. O owner/superuser pode desabilitar
-- o trigger somente em um procedimento operacional controlado de recuperação.
CREATE OR REPLACE FUNCTION app.prevent_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$;

DROP TRIGGER IF EXISTS audit_logs_append_only ON "audit_logs";
CREATE TRIGGER audit_logs_append_only
  BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION app.prevent_audit_log_mutation();

