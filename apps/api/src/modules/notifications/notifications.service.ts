import { Prisma, prisma, withTenant } from "@chronostek/database";

type NotificationCandidate = {
  tenantId: string;
  userId: string;
  branchId?: string | null;
  type: "DEADLINE" | "SYSTEM";
  title: string;
  message: string;
  entityType: string;
  entityId: string;
};

async function createMissing(tx: Prisma.TransactionClient, candidates: NotificationCandidate[]) {
  if (!candidates.length) return;
  const userIds = [...new Set(candidates.map((item) => item.userId))];
  const entityIds = [...new Set(candidates.map((item) => item.entityId))];
  const existing = await tx.notification.findMany({
    where: { tenantId: candidates[0]!.tenantId, userId: { in: userIds }, entityId: { in: entityIds } },
    select: { userId: true, entityType: true, entityId: true, title: true },
  });
  const known = new Set(existing.map((item) => `${item.userId}:${item.entityType}:${item.entityId}:${item.title}`));
  const missing = candidates.filter((item) => !known.has(`${item.userId}:${item.entityType}:${item.entityId}:${item.title}`));
  if (missing.length) await tx.notification.createMany({ data: missing });
}

async function managerRecipients(tx: Prisma.TransactionClient, tenantId: string, branchId: string) {
  const managers = await tx.user.findMany({
    where: { tenantId, status: "ACTIVE", roles: { some: { role: { code: { in: ["ADMIN_GERAL", "GESTOR_FILIAL"] } } } } },
    select: { id: true, hasAllBranches: true, branchAccesses: { select: { branchId: true } } },
  });
  return managers.filter((user) => user.hasAllBranches || user.branchAccesses.some((access) => access.branchId === branchId)).map((user) => user.id);
}

async function secretaryRecipients(tx: Prisma.TransactionClient, tenantId: string, branchId: string) {
  const secretaries = await tx.user.findMany({
    where: { tenantId, status: "ACTIVE", roles: { some: { role: { code: "SECRETARIA" } } } },
    select: { id: true, hasAllBranches: true, branchAccesses: { select: { branchId: true } } },
  });
  return secretaries.filter((user) => user.hasAllBranches || user.branchAccesses.some((access) => access.branchId === branchId)).map((user) => user.id);
}

export async function notifyDeadlineReviewers(tx: Prisma.TransactionClient, deadline: { tenantId: string; id: string; branchId: string; title: string }, title = "Prazo aguardando aprovação") {
  const recipients = await managerRecipients(tx, deadline.tenantId, deadline.branchId);
  await createMissing(tx, recipients.map((userId) => ({
    tenantId: deadline.tenantId,
    userId,
    branchId: deadline.branchId,
    type: "DEADLINE" as const,
    title,
    message: deadline.title,
    entityType: "DEADLINE_REVIEW",
    entityId: deadline.id,
  })));
}

export async function ensureTenantOperationalNotifications(tenantId: string) {
  await withTenant(tenantId, async (tx) => {
    const now = new Date();
    const fiveDays = new Date(now.getTime() + 5 * 86_400_000);
    const twoDays = new Date(now.getTime() + 2 * 86_400_000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
    const [hearings, deadlines] = await Promise.all([
      tx.hearing.findMany({
        where: { tenantId, deletedAt: null, status: { in: ["AGENDADA", "REAGENDADA"] }, startsAt: { gte: now, lte: fiveDays } },
        select: { id: true, branchId: true, type: true, attorneyId: true, assistantId: true },
        take: 1000,
      }),
      tx.deadline.findMany({
        where: { tenantId, deletedAt: null, status: { in: ["PENDING", "IN_PROGRESS", "PENDING_APPROVAL"] }, dueAt: { gte: thirtyDaysAgo, lte: fiveDays } },
        select: { id: true, branchId: true, responsibleUserId: true, title: true, dueAt: true, status: true },
        orderBy: { dueAt: "desc" },
        take: 1000,
      }),
    ]);

    const candidates: NotificationCandidate[] = [];
    const secretariesByBranch = new Map<string, string[]>();
    const managersByBranch = new Map<string, string[]>();
    for (const hearing of hearings) {
      let secretaries = secretariesByBranch.get(hearing.branchId);
      if (!secretaries) {
        secretaries = await secretaryRecipients(tx, tenantId, hearing.branchId);
        secretariesByBranch.set(hearing.branchId, secretaries);
      }
      for (const userId of [...new Set([...secretaries, hearing.attorneyId, hearing.assistantId].filter((value): value is string => Boolean(value)))]) {
        candidates.push({ tenantId, userId, branchId: hearing.branchId, type: "SYSTEM", title: "Audiência em até cinco dias", message: hearing.type, entityType: "HEARING", entityId: hearing.id });
      }
    }
    for (const deadline of deadlines) {
      candidates.push({ tenantId, userId: deadline.responsibleUserId, branchId: deadline.branchId, type: "DEADLINE", title: deadline.dueAt < now ? "Prazo vencido" : "Prazo próximo", message: deadline.title, entityType: "DEADLINE", entityId: deadline.id });
      if (deadline.status === "PENDING_APPROVAL" || deadline.dueAt <= twoDays) {
        let recipients = managersByBranch.get(deadline.branchId);
        if (!recipients) {
          recipients = await managerRecipients(tx, tenantId, deadline.branchId);
          managersByBranch.set(deadline.branchId, recipients);
        }
        for (const userId of recipients) candidates.push({ tenantId, userId, branchId: deadline.branchId, type: "DEADLINE", title: deadline.status === "PENDING_APPROVAL" ? "Prazo aguardando aprovação" : "Prazo exige revisão em até dois dias", message: deadline.title, entityType: "DEADLINE_REVIEW", entityId: deadline.id });
      }
    }
    await createMissing(tx, candidates);
  });
}

export async function runOperationalNotificationSweep() {
  const tenants = await prisma.tenant.findMany({ where: { status: "ACTIVE" }, select: { id: true } });
  for (const tenant of tenants) await ensureTenantOperationalNotifications(tenant.id);
}

export function startNotificationScheduler(intervalMs = 15 * 60_000) {
  const run = () => void runOperationalNotificationSweep().catch((error) => console.error("Falha ao gerar alertas operacionais", error));
  run();
  const timer = setInterval(run, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
