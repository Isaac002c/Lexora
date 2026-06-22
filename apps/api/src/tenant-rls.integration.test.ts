import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { config } from "dotenv";
import { beforeAll, describe, expect, it } from "vitest";

config({ path: resolve(process.cwd(), "../../.env") });

let database: typeof import("@chronostek/database");

beforeAll(async () => {
  database = await import("@chronostek/database");
});

describe("PostgreSQL tenant row-level security", () => {
  it("does not return another tenant's operational rows", async () => {
    const tenant = await database.prisma.tenant.findFirst({ where: { status: "ACTIVE" }, select: { id: true } });
    expect(tenant).not.toBeNull();
    const ownRows = await database.withTenant(tenant!.id, (tx) => tx.branch.count({ where: { tenantId: tenant!.id } }));
    expect(ownRows).toBeGreaterThan(0);

    const foreignScope = randomUUID();
    const leakedRows = await database.withTenant(foreignScope, (tx) => tx.branch.count({ where: { tenantId: tenant!.id } }));
    expect(leakedRows).toBe(0);
  });
});
