-- Granular delete/restore capabilities for financial records.
DO $$
DECLARE
  tenant_record record;
BEGIN
  FOR tenant_record IN SELECT "id" FROM "tenants" LOOP
    PERFORM set_config('app.tenant_id', tenant_record."id"::text, true);

    INSERT INTO "permissions" ("id", "tenant_id", "code", "description")
    VALUES
      (gen_random_uuid(), tenant_record."id", 'finance.delete', 'finance.delete'),
      (gen_random_uuid(), tenant_record."id", 'finance.restore', 'finance.restore')
    ON CONFLICT ("tenant_id", "code") DO NOTHING;

    INSERT INTO "role_permissions" ("tenant_id", "role_id", "permission_id")
    SELECT role."tenant_id", role."id", permission."id"
    FROM "roles" role
    JOIN "permissions" permission ON permission."tenant_id" = role."tenant_id"
    WHERE role."tenant_id" = tenant_record."id"
      AND role."code" IN ('ADMIN_GERAL', 'GESTOR_FILIAL', 'FINANCEIRO')
      AND permission."code" IN ('finance.delete', 'finance.restore')
    ON CONFLICT ("tenant_id", "role_id", "permission_id") DO NOTHING;
  END LOOP;
END $$;
