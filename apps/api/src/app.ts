import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttpModule from "pino-http";
import { randomUUID } from "node:crypto";
import { authRouter } from "./modules/auth/auth.routes.js";
import { errorHandler } from "./lib/app-error.js";
import { lookupsRouter } from "./modules/lookups/lookups.routes.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";
import { clientsRouter } from "./modules/clients/clients.routes.js";
import { attendancesRouter } from "./modules/attendances/attendances.routes.js";
import { casesRouter } from "./modules/cases/cases.routes.js";
import { deadlinesRouter } from "./modules/deadlines/deadlines.routes.js";
import { financeRouter } from "./modules/finance/finance.routes.js";
import { documentsRouter } from "./modules/documents/documents.routes.js";
import { checklistsRouter } from "./modules/checklists/checklists.routes.js";
import { reportsRouter } from "./modules/reports/reports.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { auditRouter } from "./modules/audit/audit.routes.js";

const pinoHttp = pinoHttpModule as unknown as typeof import("pino-http").default;

export function createApp(webUrl: string) {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin: webUrl,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(
    pinoHttp({
      genReqId: (request, response) => {
        const requestId = request.headers["x-request-id"]?.toString() ?? randomUUID();
        response.setHeader("x-request-id", requestId);
        return requestId;
      },
    }),
  );

  app.get("/health", (_request, response) => {
    response.json({ status: "ok", service: "chronostek-api" });
  });

  app.use("/v1/auth", authRouter);
  app.use("/v1/lookups", lookupsRouter);
  app.use("/v1/dashboard", dashboardRouter);
  app.use("/v1/clients", clientsRouter);
  app.use("/v1/attendances", attendancesRouter);
  app.use("/v1/cases", casesRouter);
  app.use("/v1/deadlines", deadlinesRouter);
  app.use("/v1/finance", financeRouter);
  app.use("/v1/documents", documentsRouter);
  app.use("/v1/checklists", checklistsRouter);
  app.use("/v1/reports", reportsRouter);
  app.use("/v1/admin", adminRouter);
  app.use("/v1/audit", auditRouter);

  app.use((_request, response) => {
    response.status(404).type("application/problem+json").json({
      type: "https://chronostek.com.br/problems/not-found",
      title: "Recurso não encontrado",
      status: 404,
    });
  });

  app.use(errorHandler);

  return app;
}
