import type { AuthContext } from "@chronostek/auth";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext & {
        sessionId: string;
        tenantName: string;
        primaryColor: string;
        userName: string;
        userEmail: string;
        forcePasswordChange: boolean;
      };
      sessionToken?: string;
    }
  }
}

export {};
