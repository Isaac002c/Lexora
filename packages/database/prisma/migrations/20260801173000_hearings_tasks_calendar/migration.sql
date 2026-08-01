CREATE TABLE "hearings" (
  "id" UUID NOT NULL, "tenant_id" UUID NOT NULL, "branch_id" UUID NOT NULL,
  "client_id" UUID NOT NULL, "case_id" UUID NOT NULL, "legal_area_id" UUID,
  "attorney_id" UUID, "assistant_id" UUID, "type" TEXT NOT NULL,
  "starts_at" TIMESTAMPTZ(3) NOT NULL, "has_time" BOOLEAN NOT NULL DEFAULT true,
  "location" TEXT, "meeting_link" TEXT, "participants" JSONB, "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'AGENDADA', "result" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "deleted_at" TIMESTAMPTZ(3), "deleted_by_id" UUID, "deletion_reason" TEXT,
  CONSTRAINT "hearings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "hearings_tenant_id_id_key" ON "hearings"("tenant_id", "id");
CREATE INDEX "hearings_tenant_id_branch_id_starts_at_idx" ON "hearings"("tenant_id", "branch_id", "starts_at");
CREATE INDEX "hearings_tenant_id_attorney_id_starts_at_idx" ON "hearings"("tenant_id", "attorney_id", "starts_at");
CREATE INDEX "hearings_tenant_id_deleted_at_idx" ON "hearings"("tenant_id", "deleted_at");

CREATE TABLE "tasks" (
  "id" UUID NOT NULL, "tenant_id" UUID NOT NULL, "branch_id" UUID, "client_id" UUID,
  "case_id" UUID, "attendance_id" UUID, "deadline_id" UUID, "hearing_id" UUID,
  "legal_area_id" UUID, "assignee_id" UUID NOT NULL, "requester_id" UUID NOT NULL,
  "title" TEXT NOT NULL, "description" TEXT, "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "due_at" TIMESTAMPTZ(3), "status" TEXT NOT NULL DEFAULT 'PENDENTE',
  "checklist" JSONB, "comments" JSONB, "completed_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "deleted_at" TIMESTAMPTZ(3), "deleted_by_id" UUID, "deletion_reason" TEXT,
  CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "tasks_tenant_id_id_key" ON "tasks"("tenant_id", "id");
CREATE INDEX "tasks_tenant_id_assignee_id_status_due_at_idx" ON "tasks"("tenant_id", "assignee_id", "status", "due_at");
CREATE INDEX "tasks_tenant_id_branch_id_status_idx" ON "tasks"("tenant_id", "branch_id", "status");
CREATE INDEX "tasks_tenant_id_deleted_at_idx" ON "tasks"("tenant_id", "deleted_at");

CREATE TABLE "calendar_events" (
  "id" UUID NOT NULL, "tenant_id" UUID NOT NULL, "branch_id" UUID, "owner_user_id" UUID,
  "legal_area_id" UUID, "client_id" UUID, "case_id" UUID, "type" TEXT NOT NULL,
  "title" TEXT NOT NULL, "description" TEXT, "starts_at" TIMESTAMPTZ(3) NOT NULL,
  "ends_at" TIMESTAMPTZ(3), "all_day" BOOLEAN NOT NULL DEFAULT false,
  "recurrence" JSONB, "location" TEXT, "meeting_link" TEXT, "participants" JSONB,
  "reminders" JSONB, "status" TEXT NOT NULL DEFAULT 'AGENDADO',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "deleted_at" TIMESTAMPTZ(3), "deleted_by_id" UUID, "deletion_reason" TEXT,
  CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "calendar_events_tenant_id_id_key" ON "calendar_events"("tenant_id", "id");
CREATE INDEX "calendar_events_tenant_id_starts_at_ends_at_idx" ON "calendar_events"("tenant_id", "starts_at", "ends_at");
CREATE INDEX "calendar_events_tenant_id_owner_user_id_starts_at_idx" ON "calendar_events"("tenant_id", "owner_user_id", "starts_at");
CREATE INDEX "calendar_events_tenant_id_deleted_at_idx" ON "calendar_events"("tenant_id", "deleted_at");

ALTER TABLE "hearings" ENABLE ROW LEVEL SECURITY; ALTER TABLE "hearings" FORCE ROW LEVEL SECURITY;
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY; ALTER TABLE "tasks" FORCE ROW LEVEL SECURITY;
ALTER TABLE "calendar_events" ENABLE ROW LEVEL SECURITY; ALTER TABLE "calendar_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "hearings" USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY tenant_isolation ON "tasks" USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY tenant_isolation ON "calendar_events" USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id());

DO $$
DECLARE tenant_record record;
BEGIN
  FOR tenant_record IN SELECT "id" FROM "tenants" LOOP
    PERFORM set_config('app.tenant_id', tenant_record."id"::text, true);
    INSERT INTO "permissions" ("id", "tenant_id", "code", "description")
    SELECT gen_random_uuid(), tenant_record."id", code, code FROM (VALUES
      ('hearing.read'), ('hearing.create'), ('hearing.update'), ('hearing.delete'), ('hearing.restore'), ('hearing.export'), ('hearing.history'),
      ('task.read'), ('task.create'), ('task.update'), ('task.delete'), ('task.restore'), ('task.export'), ('task.history'),
      ('calendar.read'), ('calendar.create'), ('calendar.update'), ('calendar.delete'), ('calendar.restore')
    ) AS permission_values(code) ON CONFLICT ("tenant_id", "code") DO NOTHING;
    INSERT INTO "role_permissions" ("tenant_id", "role_id", "permission_id")
    SELECT role."tenant_id", role."id", permission."id" FROM "roles" role
    JOIN "permissions" permission ON permission."tenant_id" = role."tenant_id"
    WHERE role."tenant_id" = tenant_record."id" AND permission."code" IN (
      'hearing.read','hearing.create','hearing.update','hearing.delete','hearing.restore','hearing.export','hearing.history',
      'task.read','task.create','task.update','task.delete','task.restore','task.export','task.history',
      'calendar.read','calendar.create','calendar.update','calendar.delete','calendar.restore'
    ) AND (
      role."code" IN ('ADMIN_GERAL','GESTOR_FILIAL')
      OR (role."code" = 'SECRETARIA' AND permission."code" IN ('hearing.read','hearing.create','hearing.update','task.read','task.create','calendar.read','calendar.create','calendar.update'))
      OR (role."code" = 'ADVOGADO')
      OR (role."code" = 'VISUALIZADOR' AND permission."code" IN ('hearing.read','hearing.export','hearing.history','task.read','task.export','task.history','calendar.read'))
    ) ON CONFLICT ("tenant_id", "role_id", "permission_id") DO NOTHING;
  END LOOP;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'chronostek_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "hearings", "tasks", "calendar_events" TO chronostek_app;
  END IF;
END $$;
