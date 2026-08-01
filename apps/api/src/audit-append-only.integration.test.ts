import { resolve } from "node:path";
import { config } from "dotenv";
import { beforeAll, describe, expect, it } from "vitest";

config({ path: resolve(process.cwd(), "../../.env") });

let database: typeof import("@chronostek/database");

beforeAll(async () => {
  database = await import("@chronostek/database");
});

describe("audit trail immutability", () => {
  it("rejects updates to an existing tenant audit event", async () => {
    const tenant = await database.prisma.tenant.findFirst({ select: { id: true } });
    expect(tenant).not.toBeNull();
    const event = await database.withTenant(tenant!.id, (tx) => tx.auditLog.findFirst({
      where: { tenantId: tenant!.id },
      select: { id: true, description: true },
    }));
    expect(event).not.toBeNull();

    await expect(database.withTenant(tenant!.id, (tx) => tx.auditLog.update({
      where: { id: event!.id },
      data: { description: `${event!.description} alterado` },
    }))).rejects.toThrow(/append-only/i);
  });
});
