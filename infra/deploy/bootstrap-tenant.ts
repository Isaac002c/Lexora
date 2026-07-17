// Bootstrap de PRODUÇÃO (sem dados fictícios): cria apenas o tenant, o catálogo de
// permissões, os 6 papéis com suas permissões, as filiais e áreas iniciais e UM
// administrador geral com senha forte. Não cria usuários de demonstração nem dados
// operacionais. Parametrizado por variáveis de ambiente.
import { permissions, type PermissionCode, type RoleCode } from "@chronostek/auth";
import { PrismaClient, UserStatus } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

const env = (k: string, required = true) => {
  const v = process.env[k];
  if (!v && required) throw new Error(`Variável de ambiente ausente: ${k}`);
  return v ?? "";
};

const TENANT_SLUG = env("TENANT_SLUG");
const TENANT_LEGAL = env("TENANT_LEGAL_NAME", false) || "Chronostek Advocacia";
const TENANT_TRADE = env("TENANT_TRADE_NAME", false) || "Lexora";
const ADMIN_NAME = env("ADMIN_NAME", false) || "Administrador";
const ADMIN_EMAIL = env("ADMIN_EMAIL");
const ADMIN_PASSWORD = env("ADMIN_PASSWORD");
const ADMIN_FORCE_CHANGE = env("ADMIN_FORCE_CHANGE", false) !== "false";

const rolePermissions: Record<RoleCode, PermissionCode[]> = {
  ADMIN_GERAL: [...permissions],
  GESTOR_FILIAL: [
    "dashboard.read", "client.read", "client.create", "client.update", "attendance.read", "attendance.create",
    "attendance.update", "attendance.convert", "case.read", "case.create", "case.update", "deadline.read",
    "deadline.manage", "document.read", "document.upload", "checklist.manage", "finance.read", "report.read", "audit.read",
  ],
  SECRETARIA: [
    "dashboard.read", "client.read", "client.create", "client.update", "attendance.read", "attendance.create",
    "attendance.update", "attendance.convert", "case.read", "case.create", "deadline.read", "document.read", "document.upload",
  ],
  ADVOGADO: [
    "dashboard.read", "client.read", "attendance.read", "case.read", "case.update_assigned", "deadline.read",
    "deadline.manage", "document.read", "document.upload", "checklist.manage",
  ],
  FINANCEIRO: ["dashboard.read", "client.read", "case.read", "finance.read", "finance.update", "report.read", "document.read", "document.upload"],
  VISUALIZADOR: ["dashboard.read", "client.read", "attendance.read", "case.read", "deadline.read", "document.read", "finance.read", "report.read"],
};

const roleNames: Record<RoleCode, string> = {
  ADMIN_GERAL: "Administrador geral", GESTOR_FILIAL: "Gestor de filial", SECRETARIA: "Secretaria",
  ADVOGADO: "Advogado", FINANCEIRO: "Financeiro", VISUALIZADOR: "Visualizador",
};

const branchSeeds = [["MATRIZ", "Matriz"], ["NORTE", "Filial Norte"], ["SUL", "Filial Sul"], ["LESTE", "Filial Leste"]] as const;
const legalAreaSeeds = ["Trabalhista", "Criminal", "Cível", "Juizado Cível", "Vara Cível", "Federal", "Administrativo"];
const toCode = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "_");

async function main() {
  const passwordHash = await argon2.hash(ADMIN_PASSWORD, { type: argon2.argon2id });
  await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.upsert({
      where: { slug: TENANT_SLUG },
      update: { tradeName: TENANT_TRADE },
      create: { legalName: TENANT_LEGAL, tradeName: TENANT_TRADE, slug: TENANT_SLUG },
    });
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenant.id}, true)`;
    await tx.tenantSettings.upsert({ where: { tenantId: tenant.id }, update: {}, create: { tenantId: tenant.id } });

    for (const [code, name] of branchSeeds) {
      await tx.branch.upsert({ where: { tenantId_code: { tenantId: tenant.id, code } }, update: { name }, create: { tenantId: tenant.id, code, name } });
    }
    const permissionRecords = new Map<string, { id: string }>();
    for (const code of permissions) {
      const record = await tx.permission.upsert({ where: { tenantId_code: { tenantId: tenant.id, code } }, update: {}, create: { tenantId: tenant.id, code, description: code }, select: { id: true } });
      permissionRecords.set(code, record);
    }
    for (const code of Object.keys(rolePermissions) as RoleCode[]) {
      const role = await tx.role.upsert({ where: { tenantId_code: { tenantId: tenant.id, code } }, update: { name: roleNames[code] }, create: { tenantId: tenant.id, code, name: roleNames[code], isSystem: true }, select: { id: true } });
      await tx.rolePermission.deleteMany({ where: { tenantId: tenant.id, roleId: role.id } });
      await tx.rolePermission.createMany({ data: rolePermissions[code].map((p) => ({ tenantId: tenant.id, roleId: role.id, permissionId: permissionRecords.get(p)!.id })) });
    }
    for (const name of legalAreaSeeds) {
      await tx.legalArea.upsert({ where: { tenantId_code: { tenantId: tenant.id, code: toCode(name) } }, update: { name }, create: { tenantId: tenant.id, name, code: toCode(name) } });
    }
    const adminRole = await tx.role.findFirstOrThrow({ where: { tenantId: tenant.id, code: "ADMIN_GERAL" }, select: { id: true } });
    const admin = await tx.user.upsert({
      where: { tenantId_emailNormalized: { tenantId: tenant.id, emailNormalized: ADMIN_EMAIL.toLowerCase() } },
      update: { name: ADMIN_NAME, passwordHash, status: UserStatus.ACTIVE, hasAllBranches: true, forcePasswordChange: ADMIN_FORCE_CHANGE },
      create: { tenantId: tenant.id, name: ADMIN_NAME, email: ADMIN_EMAIL, emailNormalized: ADMIN_EMAIL.toLowerCase(), passwordHash, status: UserStatus.ACTIVE, hasAllBranches: true, forcePasswordChange: ADMIN_FORCE_CHANGE },
    });
    await tx.userRole.deleteMany({ where: { tenantId: tenant.id, userId: admin.id } });
    await tx.userRole.create({ data: { tenantId: tenant.id, userId: admin.id, roleId: adminRole.id } });

    console.info(`Bootstrap OK: tenant '${tenant.slug}', ${branchSeeds.length} filiais, ${legalAreaSeeds.length} áreas, admin ${ADMIN_EMAIL} (forceChange=${ADMIN_FORCE_CHANGE}).`);
  }, { timeout: 120_000, maxWait: 30_000 });
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
