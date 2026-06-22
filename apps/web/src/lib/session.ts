export const SESSION_COOKIE_SECURE = process.env.COOKIE_SECURE === "true";
export const SESSION_COOKIE = SESSION_COOKIE_SECURE ? "__Host-chronostek_session" : "chronostek_session";

export interface CurrentUser {
  tenantName: string;
  primaryColor: string;
  userId: string;
  userName: string;
  userEmail: string;
  forcePasswordChange: boolean;
  roles: string[];
  permissions: string[];
  hasAllBranches: boolean;
  branchIds: string[];
}
