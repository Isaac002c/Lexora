import { permissions, type PermissionCode, type RoleCode } from "@chronostek/auth";
import { Prisma, PrismaClient, UserStatus } from "@prisma/client";
import argon2 from "argon2";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// O Prisma CLI carrega o .env automaticamente, mas `tsx prisma/seed.ts` não.
// Carregamos o .env (raiz do monorepo ou local) antes de instanciar o client.
// Em produção o DATABASE_URL já vem do ambiente, então este bloco é ignorado.
if (!process.env.DATABASE_URL) {
  for (const candidate of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")]) {
    if (existsSync(candidate)) {
      process.loadEnvFile(candidate);
      if (process.env.DATABASE_URL) break;
    }
  }
}

const prisma = new PrismaClient();

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
  ADMIN_GERAL: "Administrador geral",
  GESTOR_FILIAL: "Gestor de filial",
  SECRETARIA: "Secretaria",
  ADVOGADO: "Advogado",
  FINANCEIRO: "Financeiro",
  VISUALIZADOR: "Visualizador",
};

const branchSeeds = [
  ["MATRIZ", "Matriz Centro"],
  ["NORTE", "Filial Norte"],
  ["SUL", "Filial Sul"],
  ["LESTE", "Filial Leste"],
] as const;

// Áreas iniciais conforme especificação do MVP Lexora.
const legalAreaSeeds = ["Trabalhista", "Criminal", "Cível", "Juizado Cível", "Vara Cível", "Federal", "Administrativo"];

const userSeeds: Array<{ name: string; email: string; role: RoleCode; branch: number | "ALL" }> = [
  { name: "Douglas Almeida", email: "douglas@demo.chronostek.com.br", role: "ADMIN_GERAL", branch: "ALL" },
  { name: "Marina Costa", email: "marina@demo.chronostek.com.br", role: "ADMIN_GERAL", branch: "ALL" },
  { name: "Carlos Ribeiro", email: "carlos@demo.chronostek.com.br", role: "GESTOR_FILIAL", branch: 0 },
  { name: "Juliana Mendes", email: "juliana@demo.chronostek.com.br", role: "GESTOR_FILIAL", branch: 1 },
  { name: "Patrícia Lima", email: "patricia@demo.chronostek.com.br", role: "SECRETARIA", branch: 0 },
  { name: "Camila Rocha", email: "camila@demo.chronostek.com.br", role: "SECRETARIA", branch: 1 },
  { name: "Fernanda Alves", email: "fernanda@demo.chronostek.com.br", role: "SECRETARIA", branch: 2 },
  { name: "Renata Souza", email: "renata@demo.chronostek.com.br", role: "SECRETARIA", branch: 3 },
  { name: "Lucas Martins", email: "lucas@demo.chronostek.com.br", role: "ADVOGADO", branch: 0 },
  { name: "Beatriz Nunes", email: "beatriz@demo.chronostek.com.br", role: "ADVOGADO", branch: 0 },
  { name: "Rafael Gomes", email: "rafael@demo.chronostek.com.br", role: "ADVOGADO", branch: 1 },
  { name: "Isabela Freitas", email: "isabela@demo.chronostek.com.br", role: "ADVOGADO", branch: 2 },
  { name: "Gustavo Moreira", email: "gustavo@demo.chronostek.com.br", role: "ADVOGADO", branch: 3 },
  { name: "Ana Paula Silva", email: "ana@demo.chronostek.com.br", role: "FINANCEIRO", branch: "ALL" },
  { name: "Eduardo Castro", email: "eduardo@demo.chronostek.com.br", role: "FINANCEIRO", branch: "ALL" },
  { name: "Sofia Barros", email: "sofia@demo.chronostek.com.br", role: "VISUALIZADOR", branch: 2 },
  { name: "Thiago Melo", email: "thiago@demo.chronostek.com.br", role: "VISUALIZADOR", branch: 3 },
];

function toCode(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

async function main() {
  // Argon2 é custoso: gera o hash uma única vez, fora da transação, para mantê-la curta.
  const passwordHash = await argon2.hash("Chronostek@123", { type: argon2.argon2id });

  await prisma.$transaction(
    async (tx) => {
      // A tabela `tenants` não tem RLS (é descoberta por slug no login), então o
      // tenant pode ser criado antes de definirmos o contexto de tenant.
      // `tenant_settings`, porém, tem RLS — por isso é criado depois (abaixo).
      const tenant = await tx.tenant.upsert({
        where: { slug: "demo-chronostek" },
        update: { tradeName: "Lexora Advocacia Demo" },
        create: {
          legalName: "Chronostek Advocacia Demonstração Ltda.",
          tradeName: "Lexora Advocacia Demo",
          slug: "demo-chronostek",
        },
      });

      // Defesa em profundidade: todas as tabelas operacionais têm RLS forçado.
      // Definimos `app.tenant_id` (transação-local) para que os INSERT/SELECT
      // seguintes passem na política `tenant_id = app.current_tenant_id()`.
      // Isso permite rodar o seed com a role da aplicação, sem superusuário.
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenant.id}, true)`;

      // tenant_settings tem RLS, então é criado já com o contexto de tenant ativo.
      await tx.tenantSettings.upsert({
        where: { tenantId: tenant.id },
        update: {},
        create: { tenantId: tenant.id, contactEmail: "contato@demo.chronostek.com.br", contactPhone: "+55 11 4000-0000" },
      });

      const branches = [];
      for (const [code, name] of branchSeeds) {
        branches.push(await tx.branch.upsert({
          where: { tenantId_code: { tenantId: tenant.id, code } },
          update: { name },
          create: { tenantId: tenant.id, code, name },
        }));
      }

      const permissionRecords = new Map<string, { id: string }>();
      for (const code of permissions) {
        const record = await tx.permission.upsert({
          where: { tenantId_code: { tenantId: tenant.id, code } },
          update: {},
          create: { tenantId: tenant.id, code, description: code },
          select: { id: true },
        });
        permissionRecords.set(code, record);
      }

      const roleRecords = new Map<RoleCode, { id: string }>();
      for (const code of Object.keys(rolePermissions) as RoleCode[]) {
        const role = await tx.role.upsert({
          where: { tenantId_code: { tenantId: tenant.id, code } },
          update: { name: roleNames[code] },
          create: { tenantId: tenant.id, code, name: roleNames[code], isSystem: true },
          select: { id: true },
        });
        roleRecords.set(code, role);
        await tx.rolePermission.deleteMany({ where: { tenantId: tenant.id, roleId: role.id } });
        await tx.rolePermission.createMany({
          data: rolePermissions[code].map((permissionCode) => ({
            tenantId: tenant.id,
            roleId: role.id,
            permissionId: permissionRecords.get(permissionCode)!.id,
          })),
        });
      }

      const areas = [];
      for (const name of legalAreaSeeds) {
        const code = toCode(name);
        areas.push(await tx.legalArea.upsert({
          where: { tenantId_code: { tenantId: tenant.id, code } },
          update: { name },
          create: { tenantId: tenant.id, name, code },
        }));
      }

      for (const seed of userSeeds) {
        // Administradores entram direto (sem troca forçada) para facilitar a
        // homologação; os demais perfis demonstram a troca obrigatória no 1º acesso.
        const forcePasswordChange = seed.role !== "ADMIN_GERAL";
        const user = await tx.user.upsert({
          where: { tenantId_emailNormalized: { tenantId: tenant.id, emailNormalized: seed.email.toLowerCase() } },
          update: { name: seed.name, forcePasswordChange },
          create: {
            tenantId: tenant.id,
            name: seed.name,
            email: seed.email,
            emailNormalized: seed.email.toLowerCase(),
            passwordHash,
            status: UserStatus.ACTIVE,
            hasAllBranches: seed.branch === "ALL",
            forcePasswordChange,
          },
        });
        await tx.userRole.deleteMany({ where: { tenantId: tenant.id, userId: user.id } });
        await tx.userRole.create({ data: { tenantId: tenant.id, userId: user.id, roleId: roleRecords.get(seed.role)!.id } });
        await tx.userBranchAccess.deleteMany({ where: { tenantId: tenant.id, userId: user.id } });
        if (seed.branch !== "ALL") {
          await tx.userBranchAccess.create({ data: { tenantId: tenant.id, userId: user.id, branchId: branches[seed.branch]!.id } });
        }
      }

      const civilArea = areas.find((area) => area.code === "VARA_CIVEL")!;
      let template = await tx.checklistTemplate.findFirst({ where: { tenantId: tenant.id, legalAreaId: civilArea.id, name: "Documentação inicial — Vara Cível" } });
      if (!template) {
        template = await tx.checklistTemplate.create({
          data: {
            tenantId: tenant.id,
            legalAreaId: civilArea.id,
            name: "Documentação inicial — Vara Cível",
            items: {
              create: ["Identidade", "CPF", "Comprovante de residência", "Imposto de renda", "Documentos pertinentes"].map((title, position) => ({ title, position })),
            },
          },
        });
      }

      const douglas = await tx.user.findUniqueOrThrow({ where: { tenantId_emailNormalized: { tenantId: tenant.id, emailNormalized: "douglas@demo.chronostek.com.br" } } });
      const secretary = await tx.user.findUniqueOrThrow({ where: { tenantId_emailNormalized: { tenantId: tenant.id, emailNormalized: "patricia@demo.chronostek.com.br" } } });
      const attorney = await tx.user.findUniqueOrThrow({ where: { tenantId_emailNormalized: { tenantId: tenant.id, emailNormalized: "lucas@demo.chronostek.com.br" } } });
      const laborArea = areas.find((area) => area.code === "TRABALHISTA")!;
      let demoClient = await tx.client.findFirst({ where: { tenantId: tenant.id, name: "Maria de Souza — Demonstração" } });
      if (!demoClient) {
        demoClient = await tx.client.create({ data: {
          tenantId: tenant.id, primaryBranchId: branches[0]!.id, responsibleUserId: douglas.id, name: "Maria de Souza — Demonstração",
          searchName: "maria de souza demonstracao", email: "maria.demo@example.com", phone: "+55 11 99999-0001",
          notes: "Registro fictício criado para apresentação do sistema.",
        } });
      }

      if (!await tx.attendance.findFirst({ where: { tenantId: tenant.id, clientId: demoClient.id, origin: "Indicação — demonstração" } })) {
        await tx.attendance.create({ data: {
          tenantId: tenant.id, branchId: branches[0]!.id, legalAreaId: laborArea.id, attorneyId: attorney.id, clientId: demoClient.id,
          clientName: demoClient.name, phone: demoClient.phone, email: demoClient.email, occurredAt: new Date(), origin: "Indicação — demonstração",
          notes: "Atendimento fictício para homologação.", status: "DIRECIONADO",
        } });
      }

      let demoCase = await tx.legalCase.findFirst({ where: { tenantId: tenant.id, caseType: "Reclamação trabalhista — demonstração" } });
      if (!demoCase) {
        demoCase = await tx.legalCase.create({ data: {
          tenantId: tenant.id, branchId: branches[0]!.id, legalAreaId: laborArea.id, caseType: "Reclamação trabalhista — demonstração",
          processNumber: "0001234-56.2026.5.02.0001", processNumberSearch: "00012345620265020001", status: "EM_ANDAMENTO",
          entryDate: new Date(), distributionDate: new Date(), lastProgress: "Petição inicial distribuída; aguardando despacho.", lastProgressAt: new Date(),
          notes: "Processo fictício criado para apresentação.", parties: { create: { clientId: demoClient.id, isPrimary: true } },
          assignments: { create: [{ userId: douglas.id, type: "INTERNAL_OWNER", isPrimary: true }, { userId: attorney.id, type: "ATTORNEY", isPrimary: true }] },
        } });
      }

      if (!await tx.deadline.findFirst({ where: { tenantId: tenant.id, caseId: demoCase.id, title: "Manifestação sobre documentos — demonstração" } })) {
        await tx.deadline.create({ data: {
          tenantId: tenant.id, branchId: branches[0]!.id, caseId: demoCase.id, clientId: demoClient.id, legalAreaId: laborArea.id,
          responsibleUserId: attorney.id, title: "Manifestação sobre documentos — demonstração", type: "MANIFESTACAO",
          dueAt: new Date(Date.now() + 4 * 86_400_000), priority: "HIGH", notes: "Prazo fictício para validar alertas vermelhos.",
        } });
      }

      if (!await tx.document.findFirst({ where: { tenantId: tenant.id, caseId: demoCase.id, name: "Comprovante de residência pendente" } })) {
        await tx.document.create({ data: {
          tenantId: tenant.id, branchId: branches[0]!.id, clientId: demoClient.id, caseId: demoCase.id, uploadedById: secretary.id,
          name: "Comprovante de residência pendente", type: "COMPROVANTE_RESIDENCIA", status: "PENDING", notes: "Aguardando envio pelo cliente.",
        } });
      }

      if (!await tx.caseChecklist.findFirst({ where: { tenantId: tenant.id, caseId: demoCase.id, name: "Checklist inicial — demonstração" } })) {
        await tx.caseChecklist.create({ data: {
          tenantId: tenant.id, caseId: demoCase.id, templateId: template.id, name: "Checklist inicial — demonstração",
          items: { create: [
            { title: "Documento de identidade", position: 0, status: "ANALISADO" },
            { title: "CPF", position: 1, status: "RECEBIDO" },
            { title: "Comprovante de residência", position: 2, status: "PENDENTE" },
          ] },
        } });
      }

      if (!await tx.feeContract.findFirst({ where: { tenantId: tenant.id, clientId: demoClient.id, notes: { contains: "DEMO-CHRONOSTEK" } } })) {
        await tx.feeContract.create({ data: {
          tenantId: tenant.id, branchId: branches[0]!.id, clientId: demoClient.id, caseId: demoCase.id,
          feeAmount: new Prisma.Decimal("9000.00"), costAmount: new Prisma.Decimal("500.00"), paymentMethod: "PIX", paymentTiming: "INSTALLMENTS",
          installmentCount: 3, status: "ACTIVE", signedAt: new Date(), notes: "DEMO-CHRONOSTEK — contrato fictício.",
          installments: { create: [
            { installmentNumber: 1, amount: new Prisma.Decimal("3166.67"), dueDate: new Date(Date.now() - 20 * 86_400_000), status: "PENDING" },
            { installmentNumber: 2, amount: new Prisma.Decimal("3166.67"), dueDate: new Date(Date.now() - 3 * 86_400_000), status: "PENDING" },
            { installmentNumber: 3, amount: new Prisma.Decimal("3166.66"), dueDate: new Date(Date.now() + 5 * 86_400_000), status: "PENDING" },
          ] },
        } });
      }

      console.info(`Seed concluído: ${tenant.tradeName}, ${branches.length} filiais, ${userSeeds.length} usuários, ${areas.length} áreas.`);
    },
    { timeout: 120_000, maxWait: 30_000 },
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
