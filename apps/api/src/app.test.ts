import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

const app = createApp("http://localhost:3000");

describe("HTTP boundary", () => {
  it("exposes a health endpoint without leaking framework details", async () => {
    const response = await request(app).get("/health").expect(200);
    expect(response.body.status).toBe("ok");
    expect(response.headers["x-powered-by"]).toBeUndefined();
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("protects authenticated endpoints", async () => {
    const response = await request(app).get("/v1/auth/me").expect(401);
    expect(response.body.title).toBe("Autenticação necessária");
  });

  it("returns problem details for unknown routes", async () => {
    const response = await request(app).get("/unknown").expect(404);
    expect(response.type).toContain("application/problem+json");
  });
});
