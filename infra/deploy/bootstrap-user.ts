// Adiciona UM usuário a um tenant já existente, sem tocar em nenhum outro registro.
// Idempotente (upsert por e-mail). O papel precisa já existir no tenant. Senha vem
// por variável de ambiente e o usuário troca no 1º acesso (forcePasswordChange).
// Reutilizável para onboarding: basta variar as variáveis de ambiente.
import { PrismaClient, UserStatus } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();
const env = (k: string, required = true) => {
  const v = process.env[k];
  if (!v && required) throw new Error(`Variável de ambiente ausente: ${k}`);
  return v ?? "";
};

const TENANT_SLUG = env("TENANT_SLUG");
const USER_EMAIL = env("USER_EMAIL");
const USER_NAME = env("USER_NAME");
const USER_ROLE = env("USER_ROLE"); // código do papel existente (ex.: SECRETARIA)
const USER_PW = env("USER_PW");
const ALL_BRANCHES = env("USER_ALL_BRANCHES", false) !== "false"; // padrão: true
const BRANCH_CODES = env("USER_BRANCH_CODES", false).split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
const FORCE_CHANGE = env("USER_FORCE_CHANGE", false) !== "false"; // padrão: true

async function main() {
  const passwordHash = await argon2.hash(USER_PW, { type: argon2.argon2id });
  const emailNormalized = USER_EMAIL.toLowerCase();

  await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.findFirstOrThrow({ where: { slug: TENANT_SLUG }, select: { id: true } });
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenant.id}, true)`;

    const role = await tx.role.findFirstOrThrow({ where: { tenantId: tenant.id, code: USER_ROLE }, select: { id: true, name: true } });

    const user = await tx.user.upsert({
      where: { tenantId_emailNormalized: { tenantId: tenant.id, emailNormalized } },
      update: { name: USER_NAME, passwordHash, status: UserStatus.ACTIVE, hasAllBranches: ALL_BRANCHES, forcePasswordChange: FORCE_CHANGE },
      create: { tenantId: tenant.id, name: USER_NAME, email: USER_EMAIL, emailNormalized, passwordHash, status: UserStatus.ACTIVE, hasAllBranches: ALL_BRANCHES, forcePasswordChange: FORCE_CHANGE },
      select: { id: true },
    });

    await tx.userRole.deleteMany({ where: { tenantId: tenant.id, userId: user.id } });
    await tx.userRole.create({ data: { tenantId: tenant.id, userId: user.id, roleId: role.id } });

    // Acesso a filiais: se não for "todas", vincula as filiais informadas por código.
    await tx.userBranchAccess.deleteMany({ where: { tenantId: tenant.id, userId: user.id } });
    let scoped: string[] = [];
    if (!ALL_BRANCHES && BRANCH_CODES.length > 0) {
      const branches = await tx.branch.findMany({ where: { tenantId: tenant.id, code: { in: BRANCH_CODES } }, select: { id: true, code: true } });
      if (branches.length !== BRANCH_CODES.length) {
        const found = new Set(branches.map((b) => b.code));
        throw new Error(`Filial(is) não encontrada(s): ${BRANCH_CODES.filter((c) => !found.has(c)).join(", ")}`);
      }
      await tx.userBranchAccess.createMany({ data: branches.map((b) => ({ tenantId: tenant.id, userId: user.id, branchId: b.id })) });
      scoped = branches.map((b) => b.code);
    }

    console.info(`OK: usuario '${USER_EMAIL}' | papel=${USER_ROLE} (${role.name}) | filiais=${ALL_BRANCHES ? "TODAS" : scoped.join(", ") || "NENHUMA"} | forceChange=${FORCE_CHANGE}.`);
  }, { timeout: 60_000, maxWait: 20_000 });
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
