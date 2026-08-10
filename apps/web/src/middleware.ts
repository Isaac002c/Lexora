import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const isAuthPage = ["/login", "/recuperar-acesso"].includes(request.nextUrl.pathname);
  if (!hasSession && !isAuthPage) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|telun-logo.jpeg|manifest.webmanifest).*)",
  ],
};
