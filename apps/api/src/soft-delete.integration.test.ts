import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { config } from "dotenv";
import { beforeAll, describe, expect, it } from "vitest";

config({ path: resolve(process.cwd(), "../../.env") });
let database: typeof import("@chronostek/database");

beforeAll(async () => { database = await import("@chronostek/database"); });

describe("logical deletion and restoration", () => {
  it("hides an excluded operational record and restores it without data loss", async () => {
    const tenant = await database.prisma.tenant.findFirst({ select: { id: true } });
    expect(tenant).not.toBeNull();
    const branch = await database.withTenant(tenant!.id, (tx) => tx.branch.findFirst({ where: { tenantId: tenant!.id }, select: { id: true } }));
    expect(branch).not.toBeNull();
    const id = randomUUID();
    try {
      await database.withTenant(tenant!.id, (tx) => tx.client.create({ data: { id, tenantId: tenant!.id, primaryBranchId: branch!.id, name: "Teste de exclusão lógica", searchName: `teste-${id}` } }));
      await database.withTenant(tenant!.id, (tx) => tx.client.update({ where: { tenantId_id: { tenantId: tenant!.id, id } }, data: { deletedAt: new Date(), deletionReason: "Teste automatizado" } }));
      const operational = await database.withTenant(tenant!.id, (tx) => tx.client.findFirst({ where: { tenantId: tenant!.id, id, deletedAt: null } }));
      expect(operational).toBeNull();
      const deleted = await database.withTenant(tenant!.id, (tx) => tx.client.findFirst({ where: { tenantId: tenant!.id, id, deletedAt: { not: null } } }));
      expect(deleted?.name).toBe("Teste de exclusão lógica");
      const restored = await database.withTenant(tenant!.id, (tx) => tx.client.update({ where: { tenantId_id: { tenantId: tenant!.id, id } }, data: { deletedAt: null, deletionReason: null } }));
      expect(restored.deletedAt).toBeNull();
      expect(restored.name).toBe("Teste de exclusão lógica");
    } finally {
      await database.withTenant(tenant!.id, (tx) => tx.client.deleteMany({ where: { tenantId: tenant!.id, id } }));
    }
  });
});
