import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/server-api";
import { SESSION_COOKIE, SESSION_COOKIE_SECURE } from "@/lib/session";

export async function POST() {
  await apiFetch("/v1/auth/logout", { method: "POST" });
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: SESSION_COOKIE_SECURE,
    sameSite: "lax",
    expires: new Date(0),
    path: "/",
  });
  return response;
}
