-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('NOVO', 'EM_TRIAGEM', 'AGUARDANDO_DOCUMENTOS', 'DIRECIONADO', 'CONVERTIDO_EM_PROCESSO', 'ENCERRADO');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('EM_ANALISE', 'AGUARDANDO_DOCUMENTOS', 'AGUARDANDO_CONTRATO', 'AGUARDANDO_PAGAMENTO', 'PETICAO_INICIAL', 'PRONTO_PARA_DISTRIBUICAO', 'DISTRIBUIDO', 'EM_ANDAMENTO', 'FINALIZADO', 'ARQUIVADO');

-- CreateEnum
CREATE TYPE "AssignmentType" AS ENUM ('INTERNAL_OWNER', 'ATTORNEY', 'COLLABORATOR');

-- CreateEnum
CREATE TYPE "DeadlineType" AS ENUM ('PETICAO_INICIAL', 'AUDIENCIA', 'RECURSO', 'MANIFESTACAO', 'ADMINISTRATIVO', 'OUTRO');

-- CreateEnum
CREATE TYPE "DeadlinePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "DeadlineStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'RECEIVED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ChecklistItemStatus" AS ENUM ('PENDENTE', 'RECEBIDO', 'ANALISADO', 'RECUSADO', 'NAO_SE_APLICA');

-- CreateEnum
CREATE TYPE "StorageDriver" AS ENUM ('LOCAL', 'S3');

-- CreateEnum
CREATE TYPE "FeeContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentTiming" AS ENUM ('UPFRONT', 'END_OF_CASE', 'INSTALLMENTS');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'PIX', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'BOLETO_MANUAL', 'OTHER');

-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DEADLINE', 'DOCUMENT', 'FINANCIAL', 'SYSTEM');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "legal_name" TEXT NOT NULL,
    "trade_name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_settings" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "logo_file_id" UUID,
    "primary_color" TEXT NOT NULL DEFAULT '#06B6D4',
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "website" TEXT,
    "address" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_normalized" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
    "has_all_branches" BOOLEAN NOT NULL DEFAULT false,
    "force_password_change" BOOLEAN NOT NULL DEFAULT true,
    "phone" TEXT,
    "bar_registration" TEXT,
    "last_login_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "archived_at" TIMESTAMPTZ(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("tenant_id","user_id","role_id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "tenant_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("tenant_id","role_id","permission_id")
);

-- CreateTable
CREATE TABLE "user_branch_access" (
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_branch_access_pkey" PRIMARY KEY ("tenant_id","user_id","branch_id")
);

-- CreateTable
CREATE TABLE "legal_areas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "legal_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "primary_branch_id" UUID NOT NULL,
    "responsible_user_id" UUID,
    "type" "ClientType" NOT NULL DEFAULT 'INDIVIDUAL',
    "name" TEXT NOT NULL,
    "search_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "tax_id_encrypted" TEXT,
    "tax_id_hash" TEXT,
    "tax_id_last4" TEXT,
    "identity_encrypted" TEXT,
    "birth_date" DATE,
    "address" JSONB,
    "notes" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "archived_at" TIMESTAMPTZ(3),

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "legal_area_id" UUID,
    "attorney_id" UUID,
    "client_id" UUID,
    "converted_case_id" UUID,
    "client_name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "origin" TEXT,
    "notes" TEXT,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'NOVO',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_cases" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "legal_area_id" UUID NOT NULL,
    "case_type" TEXT NOT NULL,
    "process_number" TEXT,
    "process_number_search" TEXT,
    "status" "CaseStatus" NOT NULL DEFAULT 'EM_ANALISE',
    "entry_date" DATE NOT NULL,
    "distribution_date" DATE,
    "initial_petition_due_at" TIMESTAMPTZ(3),
    "hearing_at" TIMESTAMPTZ(3),
    "appeal_due_at" TIMESTAMPTZ(3),
    "last_progress" TEXT,
    "last_progress_at" TIMESTAMPTZ(3),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "archived_at" TIMESTAMPTZ(3),

    CONSTRAINT "legal_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_parties" (
    "tenant_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CLIENT',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "case_parties_pkey" PRIMARY KEY ("tenant_id","case_id","client_id")
);

-- CreateTable
CREATE TABLE "case_assignments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "AssignmentType" NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deadlines" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "legal_area_id" UUID NOT NULL,
    "responsible_user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "type" "DeadlineType" NOT NULL,
    "due_at" TIMESTAMPTZ(3) NOT NULL,
    "priority" "DeadlinePriority" NOT NULL DEFAULT 'NORMAL',
    "status" "DeadlineStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "deadlines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stored_files" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "uploaded_by_id" UUID NOT NULL,
    "driver" "StorageDriver" NOT NULL DEFAULT 'LOCAL',
    "object_key" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "checksum" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "stored_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "client_id" UUID,
    "case_id" UUID,
    "stored_file_id" UUID,
    "uploaded_by_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'RECEIVED',
    "notes" TEXT,
    "sent_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_templates" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "legal_area_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "case_type" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "checklist_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_template_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL,

    CONSTRAINT "checklist_template_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_checklists" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "template_id" UUID,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "case_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" UUID NOT NULL,
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

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_contracts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "case_id" UUID,
    "fee_amount" DECIMAL(14,2) NOT NULL,
    "cost_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "payment_method" "PaymentMethod" NOT NULL,
    "payment_timing" "PaymentTiming" NOT NULL,
    "installment_count" INTEGER NOT NULL DEFAULT 1,
    "status" "FeeContractStatus" NOT NULL DEFAULT 'DRAFT',
    "signed_at" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "fee_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_installments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "contract_id" UUID NOT NULL,
    "payment_proof_file_id" UUID,
    "payment_recorded_by_id" UUID,
    "installment_number" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "due_date" DATE NOT NULL,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMPTZ(3),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payment_installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "idle_expires_at" TIMESTAMPTZ(3) NOT NULL,
    "last_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "branch_id" UUID,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" UUID,
    "read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_settings_tenant_id_key" ON "tenant_settings"("tenant_id");

-- CreateIndex
CREATE INDEX "branches_tenant_id_is_active_idx" ON "branches"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "branches_tenant_id_id_key" ON "branches"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "branches_tenant_id_code_key" ON "branches"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "users_tenant_id_status_idx" ON "users"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_id_key" ON "users"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_email_normalized_key" ON "users"("tenant_id", "email_normalized");

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenant_id_id_key" ON "roles"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenant_id_code_key" ON "roles"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_tenant_id_id_key" ON "permissions"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_tenant_id_code_key" ON "permissions"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "user_roles_tenant_id_role_id_idx" ON "user_roles"("tenant_id", "role_id");

-- CreateIndex
CREATE INDEX "role_permissions_tenant_id_permission_id_idx" ON "role_permissions"("tenant_id", "permission_id");

-- CreateIndex
CREATE INDEX "user_branch_access_tenant_id_branch_id_idx" ON "user_branch_access"("tenant_id", "branch_id");

-- CreateIndex
CREATE INDEX "legal_areas_tenant_id_is_active_idx" ON "legal_areas"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "legal_areas_tenant_id_id_key" ON "legal_areas"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "legal_areas_tenant_id_code_key" ON "legal_areas"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "clients_tenant_id_primary_branch_id_status_idx" ON "clients"("tenant_id", "primary_branch_id", "status");

-- CreateIndex
CREATE INDEX "clients_tenant_id_search_name_idx" ON "clients"("tenant_id", "search_name");

-- CreateIndex
CREATE INDEX "clients_tenant_id_email_idx" ON "clients"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "clients_tenant_id_id_key" ON "clients"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "clients_tenant_id_tax_id_hash_key" ON "clients"("tenant_id", "tax_id_hash");

-- CreateIndex
CREATE INDEX "attendances_tenant_id_branch_id_status_occurred_at_idx" ON "attendances"("tenant_id", "branch_id", "status", "occurred_at");

-- CreateIndex
CREATE INDEX "attendances_tenant_id_client_name_idx" ON "attendances"("tenant_id", "client_name");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_tenant_id_id_key" ON "attendances"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_tenant_id_converted_case_id_key" ON "attendances"("tenant_id", "converted_case_id");

-- CreateIndex
CREATE INDEX "legal_cases_tenant_id_branch_id_status_idx" ON "legal_cases"("tenant_id", "branch_id", "status");

-- CreateIndex
CREATE INDEX "legal_cases_tenant_id_legal_area_id_status_idx" ON "legal_cases"("tenant_id", "legal_area_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "legal_cases_tenant_id_id_key" ON "legal_cases"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "legal_cases_tenant_id_process_number_search_key" ON "legal_cases"("tenant_id", "process_number_search");

-- CreateIndex
CREATE INDEX "case_parties_tenant_id_client_id_idx" ON "case_parties"("tenant_id", "client_id");

-- CreateIndex
CREATE INDEX "case_assignments_tenant_id_user_id_type_idx" ON "case_assignments"("tenant_id", "user_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "case_assignments_tenant_id_id_key" ON "case_assignments"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "case_assignments_tenant_id_case_id_user_id_type_key" ON "case_assignments"("tenant_id", "case_id", "user_id", "type");

-- CreateIndex
CREATE INDEX "deadlines_tenant_id_branch_id_status_due_at_idx" ON "deadlines"("tenant_id", "branch_id", "status", "due_at");

-- CreateIndex
CREATE INDEX "deadlines_tenant_id_responsible_user_id_status_due_at_idx" ON "deadlines"("tenant_id", "responsible_user_id", "status", "due_at");

-- CreateIndex
CREATE UNIQUE INDEX "deadlines_tenant_id_id_key" ON "deadlines"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "stored_files_tenant_id_id_key" ON "stored_files"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "stored_files_tenant_id_object_key_key" ON "stored_files"("tenant_id", "object_key");

-- CreateIndex
CREATE INDEX "documents_tenant_id_branch_id_status_idx" ON "documents"("tenant_id", "branch_id", "status");

-- CreateIndex
CREATE INDEX "documents_tenant_id_client_id_idx" ON "documents"("tenant_id", "client_id");

-- CreateIndex
CREATE INDEX "documents_tenant_id_case_id_idx" ON "documents"("tenant_id", "case_id");

-- CreateIndex
CREATE UNIQUE INDEX "documents_tenant_id_id_key" ON "documents"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "documents_tenant_id_stored_file_id_key" ON "documents"("tenant_id", "stored_file_id");

-- CreateIndex
CREATE INDEX "checklist_templates_tenant_id_legal_area_id_is_active_idx" ON "checklist_templates"("tenant_id", "legal_area_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_templates_tenant_id_id_key" ON "checklist_templates"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_template_items_tenant_id_id_key" ON "checklist_template_items"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_template_items_tenant_id_template_id_position_key" ON "checklist_template_items"("tenant_id", "template_id", "position");

-- CreateIndex
CREATE INDEX "case_checklists_tenant_id_case_id_idx" ON "case_checklists"("tenant_id", "case_id");

-- CreateIndex
CREATE UNIQUE INDEX "case_checklists_tenant_id_id_key" ON "case_checklists"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_items_tenant_id_id_key" ON "checklist_items"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "checklist_items_tenant_id_checklist_id_position_key" ON "checklist_items"("tenant_id", "checklist_id", "position");

-- CreateIndex
CREATE INDEX "fee_contracts_tenant_id_branch_id_status_idx" ON "fee_contracts"("tenant_id", "branch_id", "status");

-- CreateIndex
CREATE INDEX "fee_contracts_tenant_id_client_id_idx" ON "fee_contracts"("tenant_id", "client_id");

-- CreateIndex
CREATE UNIQUE INDEX "fee_contracts_tenant_id_id_key" ON "fee_contracts"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "payment_installments_tenant_id_status_due_date_idx" ON "payment_installments"("tenant_id", "status", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "payment_installments_tenant_id_id_key" ON "payment_installments"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_installments_tenant_id_contract_id_installment_numb_key" ON "payment_installments"("tenant_id", "contract_id", "installment_number");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_tenant_id_user_id_revoked_at_idx" ON "sessions"("tenant_id", "user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tenant_id_id_key" ON "sessions"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_entity_type_entity_id_created_at_idx" ON "audit_logs"("tenant_id", "entity_type", "entity_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_actor_user_id_created_at_idx" ON "audit_logs"("tenant_id", "actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_tenant_id_user_id_read_at_created_at_idx" ON "notifications"("tenant_id", "user_id", "read_at", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_tenant_id_id_key" ON "notifications"("tenant_id", "id");

-- AddForeignKey
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_tenant_id_user_id_fkey" FOREIGN KEY ("tenant_id", "user_id") REFERENCES "users"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_tenant_id_role_id_fkey" FOREIGN KEY ("tenant_id", "role_id") REFERENCES "roles"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_tenant_id_role_id_fkey" FOREIGN KEY ("tenant_id", "role_id") REFERENCES "roles"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_tenant_id_permission_id_fkey" FOREIGN KEY ("tenant_id", "permission_id") REFERENCES "permissions"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_branch_access" ADD CONSTRAINT "user_branch_access_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_branch_access" ADD CONSTRAINT "user_branch_access_tenant_id_user_id_fkey" FOREIGN KEY ("tenant_id", "user_id") REFERENCES "users"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_branch_access" ADD CONSTRAINT "user_branch_access_tenant_id_branch_id_fkey" FOREIGN KEY ("tenant_id", "branch_id") REFERENCES "branches"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_areas" ADD CONSTRAINT "legal_areas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_tenant_id_primary_branch_id_fkey" FOREIGN KEY ("tenant_id", "primary_branch_id") REFERENCES "branches"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_tenant_id_responsible_user_id_fkey" FOREIGN KEY ("tenant_id", "responsible_user_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_tenant_id_branch_id_fkey" FOREIGN KEY ("tenant_id", "branch_id") REFERENCES "branches"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_tenant_id_legal_area_id_fkey" FOREIGN KEY ("tenant_id", "legal_area_id") REFERENCES "legal_areas"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_tenant_id_attorney_id_fkey" FOREIGN KEY ("tenant_id", "attorney_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_tenant_id_client_id_fkey" FOREIGN KEY ("tenant_id", "client_id") REFERENCES "clients"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_tenant_id_converted_case_id_fkey" FOREIGN KEY ("tenant_id", "converted_case_id") REFERENCES "legal_cases"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_cases" ADD CONSTRAINT "legal_cases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_cases" ADD CONSTRAINT "legal_cases_tenant_id_branch_id_fkey" FOREIGN KEY ("tenant_id", "branch_id") REFERENCES "branches"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_cases" ADD CONSTRAINT "legal_cases_tenant_id_legal_area_id_fkey" FOREIGN KEY ("tenant_id", "legal_area_id") REFERENCES "legal_areas"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_parties" ADD CONSTRAINT "case_parties_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_parties" ADD CONSTRAINT "case_parties_tenant_id_case_id_fkey" FOREIGN KEY ("tenant_id", "case_id") REFERENCES "legal_cases"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_parties" ADD CONSTRAINT "case_parties_tenant_id_client_id_fkey" FOREIGN KEY ("tenant_id", "client_id") REFERENCES "clients"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_assignments" ADD CONSTRAINT "case_assignments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_assignments" ADD CONSTRAINT "case_assignments_tenant_id_case_id_fkey" FOREIGN KEY ("tenant_id", "case_id") REFERENCES "legal_cases"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_assignments" ADD CONSTRAINT "case_assignments_tenant_id_user_id_fkey" FOREIGN KEY ("tenant_id", "user_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_tenant_id_branch_id_fkey" FOREIGN KEY ("tenant_id", "branch_id") REFERENCES "branches"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_tenant_id_case_id_fkey" FOREIGN KEY ("tenant_id", "case_id") REFERENCES "legal_cases"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_tenant_id_client_id_fkey" FOREIGN KEY ("tenant_id", "client_id") REFERENCES "clients"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_tenant_id_legal_area_id_fkey" FOREIGN KEY ("tenant_id", "legal_area_id") REFERENCES "legal_areas"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_tenant_id_responsible_user_id_fkey" FOREIGN KEY ("tenant_id", "responsible_user_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stored_files" ADD CONSTRAINT "stored_files_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stored_files" ADD CONSTRAINT "stored_files_tenant_id_uploaded_by_id_fkey" FOREIGN KEY ("tenant_id", "uploaded_by_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenant_id_branch_id_fkey" FOREIGN KEY ("tenant_id", "branch_id") REFERENCES "branches"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenant_id_client_id_fkey" FOREIGN KEY ("tenant_id", "client_id") REFERENCES "clients"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenant_id_case_id_fkey" FOREIGN KEY ("tenant_id", "case_id") REFERENCES "legal_cases"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenant_id_stored_file_id_fkey" FOREIGN KEY ("tenant_id", "stored_file_id") REFERENCES "stored_files"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenant_id_uploaded_by_id_fkey" FOREIGN KEY ("tenant_id", "uploaded_by_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_tenant_id_legal_area_id_fkey" FOREIGN KEY ("tenant_id", "legal_area_id") REFERENCES "legal_areas"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_template_items" ADD CONSTRAINT "checklist_template_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_template_items" ADD CONSTRAINT "checklist_template_items_tenant_id_template_id_fkey" FOREIGN KEY ("tenant_id", "template_id") REFERENCES "checklist_templates"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_checklists" ADD CONSTRAINT "case_checklists_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_checklists" ADD CONSTRAINT "case_checklists_tenant_id_case_id_fkey" FOREIGN KEY ("tenant_id", "case_id") REFERENCES "legal_cases"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_checklists" ADD CONSTRAINT "case_checklists_tenant_id_template_id_fkey" FOREIGN KEY ("tenant_id", "template_id") REFERENCES "checklist_templates"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_tenant_id_checklist_id_fkey" FOREIGN KEY ("tenant_id", "checklist_id") REFERENCES "case_checklists"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_tenant_id_updated_by_id_fkey" FOREIGN KEY ("tenant_id", "updated_by_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_contracts" ADD CONSTRAINT "fee_contracts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_contracts" ADD CONSTRAINT "fee_contracts_tenant_id_branch_id_fkey" FOREIGN KEY ("tenant_id", "branch_id") REFERENCES "branches"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_contracts" ADD CONSTRAINT "fee_contracts_tenant_id_client_id_fkey" FOREIGN KEY ("tenant_id", "client_id") REFERENCES "clients"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_contracts" ADD CONSTRAINT "fee_contracts_tenant_id_case_id_fkey" FOREIGN KEY ("tenant_id", "case_id") REFERENCES "legal_cases"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_installments" ADD CONSTRAINT "payment_installments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_installments" ADD CONSTRAINT "payment_installments_tenant_id_contract_id_fkey" FOREIGN KEY ("tenant_id", "contract_id") REFERENCES "fee_contracts"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_installments" ADD CONSTRAINT "payment_installments_tenant_id_payment_recorded_by_id_fkey" FOREIGN KEY ("tenant_id", "payment_recorded_by_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_tenant_id_user_id_fkey" FOREIGN KEY ("tenant_id", "user_id") REFERENCES "users"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_actor_user_id_fkey" FOREIGN KEY ("tenant_id", "actor_user_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_user_id_fkey" FOREIGN KEY ("tenant_id", "user_id") REFERENCES "users"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_branch_id_fkey" FOREIGN KEY ("tenant_id", "branch_id") REFERENCES "branches"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
