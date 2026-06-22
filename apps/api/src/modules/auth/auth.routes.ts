import { changePasswordSchema, loginSchema } from "@chronostek/contracts";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { requireAuth } from "./auth.middleware.js";
import { changePassword, login, logout } from "./auth.service.js";

export const authRouter = Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-7", legacyHeaders: false });

authRouter.post("/login", loginLimiter, async (request, response) => {
  const result = await login(loginSchema.parse(request.body), { ip: request.ip, userAgent: request.header("user-agent") });
  response.json(result);
});

authRouter.get("/me", requireAuth, (request, response) => {
  const { tenantId: _tenantId, sessionId: _sessionId, ...safeUser } = request.auth!;
  response.json(safeUser);
});

authRouter.post("/logout", requireAuth, async (request, response) => {
  await logout(request.sessionToken!);
  response.status(204).end();
});

authRouter.post("/change-password", requireAuth, async (request, response) => {
  await changePassword(request.sessionToken!, request.auth!, changePasswordSchema.parse(request.body));
  response.json({ success: true });
});
