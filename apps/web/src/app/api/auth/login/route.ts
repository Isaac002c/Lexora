import { loginSchema } from "@chronostek/contracts";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_COOKIE_SECURE } from "@/lib/session";

const apiUrl = process.env.INTERNAL_API_URL ?? "http://localhost:3333";

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ title: "Dados inválidos", errors: parsed.error.flatten().fieldErrors }, { status: 422 });

  const upstream = await fetch(`${apiUrl}/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": request.headers.get("user-agent") ?? "chronostek-web" },
    body: JSON.stringify(parsed.data),
    cache: "no-store",
  });
  const body = (await upstream.json()) as { token?: string; expiresAt?: string; forcePasswordChange?: boolean; title?: string; detail?: string };
  if (!upstream.ok || !body.token || !body.expiresAt) return NextResponse.json(body, { status: upstream.status });

  const response = NextResponse.json({ forcePasswordChange: body.forcePasswordChange });
  response.cookies.set(SESSION_COOKIE, body.token, {
    httpOnly: true,
    secure: SESSION_COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
    expires: new Date(body.expiresAt),
  });
  return response;
}
