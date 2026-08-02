ALTER TYPE "DeadlineStatus" ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL';

ALTER TABLE "legal_cases"
  ADD COLUMN "case_name" TEXT;

ALTER TABLE "deadlines"
  ADD COLUMN "submitted_for_approval_at" TIMESTAMPTZ(3),
  ADD COLUMN "reviewed_at" TIMESTAMPTZ(3),
  ADD COLUMN "reviewed_by_id" UUID,
  ADD COLUMN "review_notes" TEXT;

CREATE INDEX "deadlines_tenant_id_reviewed_by_id_idx"
  ON "deadlines"("tenant_id", "reviewed_by_id");

ALTER TABLE "deadlines"
  ADD CONSTRAINT "deadlines_tenant_id_reviewed_by_id_fkey"
  FOREIGN KEY ("tenant_id", "reviewed_by_id")
  REFERENCES "users"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "client_checklists" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "client_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "client_checklists_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "client_checklist_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "checklist_id" UUID NOT NULL,
  "updated_by_id" UUID,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "is_required" BOOLEAN NOT NULL DEFAULT true,
  "position" INTEGER NOT NULL,
  "status" "ChecklistItemStatus" NOT NULL DEFAULT 'PENDENTE',
  "notes" TEXT,
  "received_at" TIMESTAMPTZ(3),
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "client_checklist_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "client_checklists_tenant_id_id_key"
  ON "client_checklists"("tenant_id", "id");
CREATE INDEX "client_checklists_tenant_id_client_id_idx"
  ON "client_checklists"("tenant_id", "client_id");
CREATE UNIQUE INDEX "client_checklist_items_tenant_id_id_key"
  ON "client_checklist_items"("tenant_id", "id");
CREATE UNIQUE INDEX "client_checklist_items_tenant_id_checklist_id_position_key"
  ON "client_checklist_items"("tenant_id", "checklist_id", "position");

ALTER TABLE "client_checklists"
  ADD CONSTRAINT "client_checklists_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_checklists"
  ADD CONSTRAINT "client_checklists_tenant_id_client_id_fkey"
  FOREIGN KEY ("tenant_id", "client_id") REFERENCES "clients"("tenant_id", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_checklist_items"
  ADD CONSTRAINT "client_checklist_items_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_checklist_items"
  ADD CONSTRAINT "client_checklist_items_tenant_id_checklist_id_fkey"
  FOREIGN KEY ("tenant_id", "checklist_id") REFERENCES "client_checklists"("tenant_id", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_checklist_items"
  ADD CONSTRAINT "client_checklist_items_tenant_id_updated_by_id_fkey"
  FOREIGN KEY ("tenant_id", "updated_by_id") REFERENCES "users"("tenant_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "client_checklists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "client_checklists" FORCE ROW LEVEL SECURITY;
ALTER TABLE "client_checklist_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "client_checklist_items" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "client_checklists"
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY tenant_isolation ON "client_checklist_items"
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());

DO $$
DECLARE tenant_record record;
BEGIN
  FOR tenant_record IN SELECT "id" FROM "tenants" LOOP
    PERFORM set_config('app.tenant_id', tenant_record."id"::text, true);
    INSERT INTO "permissions" ("id", "tenant_id", "code", "description")
    VALUES (gen_random_uuid(), tenant_record."id", 'deadline.approve', 'Revisar e aprovar a conclusão de prazos')
    ON CONFLICT ("tenant_id", "code") DO NOTHING;

    INSERT INTO "permissions" ("id", "tenant_id", "code", "description")
    VALUES (gen_random_uuid(), tenant_record."id", 'checklist.manage', 'Gerenciar checklists de processos e clientes')
    ON CONFLICT ("tenant_id", "code") DO NOTHING;

    INSERT INTO "role_permissions" ("tenant_id", "role_id", "permission_id")
    SELECT role."tenant_id", role."id", permission."id"
    FROM "roles" role
    JOIN "permissions" permission ON permission."tenant_id" = role."tenant_id"
    WHERE role."tenant_id" = tenant_record."id"
      AND role."code" IN ('ADMIN_GERAL', 'GESTOR_FILIAL')
      AND permission."code" = 'deadline.approve'
    ON CONFLICT ("tenant_id", "role_id", "permission_id") DO NOTHING;

    INSERT INTO "role_permissions" ("tenant_id", "role_id", "permission_id")
    SELECT role."tenant_id", role."id", permission."id"
    FROM "roles" role
    JOIN "permissions" permission ON permission."tenant_id" = role."tenant_id"
    WHERE role."tenant_id" = tenant_record."id"
      AND role."code" = 'SECRETARIA'
      AND permission."code" = 'checklist.manage'
    ON CONFLICT ("tenant_id", "role_id", "permission_id") DO NOTHING;
  END LOOP;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'chronostek_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "client_checklists", "client_checklist_items" TO chronostek_app;
  END IF;
END $$;
