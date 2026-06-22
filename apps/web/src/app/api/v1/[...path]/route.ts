import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

const apiUrl = process.env.INTERNAL_API_URL ?? "http://localhost:3333";

async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const url = new URL(request.url);
  const target = `${apiUrl}/v1/${path.map(encodeURIComponent).join("/")}${url.search}`;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ title: "Autenticação necessária" }, { status: 401 });

  if (!["GET", "HEAD"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin && new URL(origin).host !== host) return NextResponse.json({ title: "Origem inválida" }, { status: 403 });
  }

  const headers = new Headers();
  headers.set("authorization", `Bearer ${token}`);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(),
    cache: "no-store",
    redirect: "manual",
  });
  const responseHeaders = new Headers();
  for (const name of ["content-type", "content-disposition", "content-length", "x-request-id"]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  return new NextResponse(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
