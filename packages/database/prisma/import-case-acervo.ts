import {
  AssignmentType,
  CaseStatus,
  ClientType,
  PrismaClient,
} from "@prisma/client";
import { readFile } from "node:fs/promises";

interface ImportRow {
  processNumber: string;
  clientName: string;
  opposingParty: string;
  legalArea: string;
  sourceYear: number;
  branchCode: string;
}

const prisma = new PrismaClient();

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function toCode(value: string) {
  return normalizeSearch(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function normalizeProcessNumber(value: string) {
  return normalizeSearch(value).replace(/\s/g, "");
}

function clientTypeFromName(value: string) {
  const normalized = toCode(value);
  return /(?:^|_)(LTDA|EIRELI|SA|COMERCIO|SERVICOS|ASSOCIACAO|COMPANHIA|EMPRESA|DESCARTAVEIS|ALIMENTOS)(?:_|$)/.test(
    normalized,
  )
    ? ClientType.COMPANY
    : ClientType.INDIVIDUAL;
}

function cleanRows(input: unknown): ImportRow[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new Error("O arquivo de importação deve conter uma lista não vazia.");
  }

  const rows = input.map((raw, index) => {
    if (!raw || typeof raw !== "object") {
      throw new Error(`Linha ${index + 1}: formato inválido.`);
    }
    const value = raw as Partial<ImportRow>;
    const row: ImportRow = {
      processNumber: String(value.processNumber ?? "").trim(),
      clientName: String(value.clientName ?? "").trim(),
      opposingParty: String(value.opposingParty ?? "").trim(),
      legalArea: String(value.legalArea ?? "").trim(),
      sourceYear: Number(value.sourceYear),
      branchCode: toCode(String(value.branchCode ?? "")),
    };
    const missing = Object.entries(row)
      .filter(([, item]) => item === "" || Number.isNaN(item))
      .map(([key]) => key);
    if (missing.length > 0) {
      throw new Error(
        `Linha ${index + 1}: campos obrigatórios ausentes (${missing.join(", ")}).`,
      );
    }
    if (!/^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/.test(row.processNumber)) {
      throw new Error(
        `Linha ${index + 1}: número de processo CNJ inválido (${row.processNumber}).`,
      );
    }
    if (!Number.isInteger(row.sourceYear) || row.sourceYear < 1900) {
      throw new Error(`Linha ${index + 1}: ano inválido.`);
    }
    return row;
  });

  const processNumbers = rows.map((row) =>
    normalizeProcessNumber(row.processNumber),
  );
  if (new Set(processNumbers).size !== processNumbers.length) {
    throw new Error("A planilha contém números de processo duplicados.");
  }
  return rows;
}

async function main() {
  const tenantSlug = requiredEnv("TENANT_SLUG");
  const importFile = requiredEnv("IMPORT_FILE");
  const responsibleEmails = requiredEnv("RESPONSIBLE_EMAILS")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (responsibleEmails.length === 0) {
    throw new Error("Informe ao menos um responsável em RESPONSIBLE_EMAILS.");
  }

  const importDateValue =
    process.env.IMPORT_DATE?.trim() ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(importDateValue)) {
    throw new Error("IMPORT_DATE deve usar o formato AAAA-MM-DD.");
  }
  const entryDate = new Date(`${importDateValue}T00:00:00.000Z`);
  if (Number.isNaN(entryDate.getTime()))
    throw new Error("IMPORT_DATE inválida.");

  const rows = cleanRows(JSON.parse(await readFile(importFile, "utf8")));
  const dryRun = process.env.DRY_RUN === "true";

  await prisma.$transaction(
    async (tx) => {
      const tenant = await tx.tenant.findUniqueOrThrow({
        where: { slug: tenantSlug },
        select: { id: true, slug: true },
      });
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenant.id}, true)`;

      const branchCodes = [...new Set(rows.map((row) => row.branchCode))];
      const branches = await tx.branch.findMany({
        where: {
          tenantId: tenant.id,
          code: { in: branchCodes },
          isActive: true,
        },
        select: { id: true, code: true },
      });
      const branchByCode = new Map(
        branches.map((branch) => [branch.code, branch]),
      );
      const missingBranches = branchCodes.filter(
        (code) => !branchByCode.has(code),
      );
      if (missingBranches.length > 0) {
        throw new Error(
          `Filiais não encontradas: ${missingBranches.join(", ")}`,
        );
      }

      const responsibles = await tx.user.findMany({
        where: {
          tenantId: tenant.id,
          emailNormalized: { in: responsibleEmails },
          status: "ACTIVE",
          archivedAt: null,
        },
        select: { id: true, emailNormalized: true },
      });
      const responsibleByEmail = new Map(
        responsibles.map((user) => [user.emailNormalized, user]),
      );
      const missingUsers = responsibleEmails.filter(
        (email) => !responsibleByEmail.has(email),
      );
      if (missingUsers.length > 0) {
        throw new Error(
          `Responsáveis não encontrados: ${missingUsers.join(", ")}`,
        );
      }
      const orderedResponsibles = responsibleEmails.map(
        (email) => responsibleByEmail.get(email)!,
      );
      const primaryResponsible = orderedResponsibles[0];
      if (!primaryResponsible) {
        throw new Error("Nenhum responsável válido foi informado.");
      }

      const requiredAreaNames = [
        ...new Set([
          ...rows.map((row) => row.legalArea),
          "Previdenciário",
          "Família",
        ]),
      ];
      const areasByCode = new Map<string, { id: string }>();
      for (const name of requiredAreaNames) {
        const code = toCode(name);
        const existing = await tx.legalArea.findUnique({
          where: { tenantId_code: { tenantId: tenant.id, code } },
          select: { id: true },
        });
        if (dryRun) {
          if (existing) areasByCode.set(code, existing);
          continue;
        }
        const area = await tx.legalArea.upsert({
          where: { tenantId_code: { tenantId: tenant.id, code } },
          update: { name, isActive: true },
          create: { tenantId: tenant.id, name, code, isActive: true },
          select: { id: true },
        });
        areasByCode.set(code, area);
      }

      let createdClients = 0;
      let reusedClients = 0;
      let createdCases = 0;
      let skippedCases = 0;

      for (const row of rows) {
        const processNumberSearch = normalizeProcessNumber(row.processNumber);
        const existingCase = await tx.legalCase.findUnique({
          where: {
            tenantId_processNumberSearch: {
              tenantId: tenant.id,
              processNumberSearch,
            },
          },
          select: { id: true },
        });
        if (existingCase) {
          skippedCases += 1;
          continue;
        }

        const branch = branchByCode.get(row.branchCode)!;
        const searchName = normalizeSearch(row.clientName);
        let client = await tx.client.findFirst({
          where: { tenantId: tenant.id, searchName, deletedAt: null },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        });
        if (client) {
          reusedClients += 1;
        } else if (!dryRun) {
          client = await tx.client.create({
            data: {
              tenantId: tenant.id,
              primaryBranchId: branch.id,
              responsibleUserId: primaryResponsible.id,
              type: clientTypeFromName(row.clientName),
              name: row.clientName,
              searchName,
              notes: `Importado do acervo operacional em ${importDateValue}.`,
            },
            select: { id: true },
          });
          createdClients += 1;
          await tx.auditLog.create({
            data: {
              tenantId: tenant.id,
              actorName: "Importação de acervo",
              actorRoles: ["SISTEMA"],
              branchId: branch.id,
              module: "CLIENTES",
              entityType: "CLIENT",
              entityId: client.id,
              action: "CLIENT_IMPORTED",
              description:
                "Cliente criado pela importação do acervo operacional",
              origin: "CLI_IMPORT",
              metadata: { source: "ACERVO PARA ENVIO AO SISTEMA (1).xlsx" },
            },
          });
        } else {
          createdClients += 1;
          client = { id: "dry-run-client" };
        }

        if (dryRun) {
          createdCases += 1;
          continue;
        }

        const legalArea = areasByCode.get(toCode(row.legalArea));
        if (!legalArea) {
          throw new Error(`Área jurídica não encontrada: ${row.legalArea}`);
        }
        const legalCase = await tx.legalCase.create({
          data: {
            tenantId: tenant.id,
            branchId: branch.id,
            legalAreaId: legalArea.id,
            caseType: "Reclamação trabalhista",
            processNumber: row.processNumber,
            processNumberSearch,
            opposingParty: row.opposingParty,
            status: CaseStatus.EM_ANALISE,
            entryDate,
            notes: `Importado do acervo operacional em ${importDateValue}. Ano informado na planilha: ${row.sourceYear}. Responsável, data limite e providência não informados na origem.`,
            parties: {
              create: { clientId: client.id, role: "CLIENT", isPrimary: true },
            },
          },
          select: { id: true },
        });
        await tx.caseAssignment.createMany({
          data: orderedResponsibles.map((user, index) => ({
            tenantId: tenant.id,
            caseId: legalCase.id,
            userId: user.id,
            type: AssignmentType.INTERNAL_OWNER,
            isPrimary: index === 0,
          })),
        });
        await tx.auditLog.create({
          data: {
            tenantId: tenant.id,
            actorName: "Importação de acervo",
            actorRoles: ["SISTEMA"],
            branchId: branch.id,
            module: "PROCESSOS",
            entityType: "LEGAL_CASE",
            entityId: legalCase.id,
            action: "CASE_IMPORTED",
            description:
              "Processo criado pela importação do acervo operacional",
            origin: "CLI_IMPORT",
            metadata: {
              source: "ACERVO PARA ENVIO AO SISTEMA (1).xlsx",
              sourceYear: row.sourceYear,
            },
          },
        });
        createdCases += 1;
      }

      console.info(
        JSON.stringify({
          tenant: tenant.slug,
          dryRun,
          inputRows: rows.length,
          createdClients,
          reusedClients,
          createdCases,
          skippedCases,
          responsibleUsers: orderedResponsibles.length,
          legalAreasEnsured: requiredAreaNames.length,
        }),
      );
    },
    { timeout: 120_000, maxWait: 30_000 },
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
