-- Defense in depth: the API must set app.tenant_id inside every transaction.
-- Production must connect with a non-superuser role that does not own these tables.
CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid
$$;

DO $$
DECLARE
  table_name text;
  tenant_tables text[] := ARRAY[
    'tenant_settings', 'branches', 'users', 'roles', 'permissions',
    'user_roles', 'role_permissions', 'user_branch_access', 'legal_areas',
    'clients', 'attendances', 'legal_cases', 'case_parties', 'case_assignments',
    'deadlines', 'stored_files', 'documents', 'checklist_templates',
    'checklist_template_items', 'case_checklists', 'checklist_items',
    'fee_contracts', 'payment_installments', 'sessions', 'audit_logs',
    'notifications'
  ];
BEGIN
  FOREACH table_name IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON public.%I USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id())',
      table_name
    );
  END LOOP;
END $$;

-- Tenants are discoverable by slug during login. Only non-sensitive identity
-- fields belong in this table; every operational table remains protected.
