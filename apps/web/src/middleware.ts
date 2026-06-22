import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const isAuthPage = request.nextUrl.pathname === "/login";
  if (!hasSession && !isAuthPage) return NextResponse.redirect(new URL("/login", request.url));
  if (hasSession && isAuthPage) return NextResponse.redirect(new URL("/dashboard", request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg).*)"] };
