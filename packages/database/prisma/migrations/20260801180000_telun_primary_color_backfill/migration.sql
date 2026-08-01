-- Consolidate existing tenants on the official Telun electric lilac token.
DO $$
DECLARE tenant_record record;
BEGIN
  FOR tenant_record IN SELECT "id" FROM "tenants" LOOP
    PERFORM set_config('app.tenant_id', tenant_record."id"::text, true);
    UPDATE "tenant_settings"
    SET "primary_color" = '#A56FFF', "updated_at" = CURRENT_TIMESTAMP
    WHERE "tenant_id" = tenant_record."id" AND "primary_color" <> '#A56FFF';
  END LOOP;
END $$;
