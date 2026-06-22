import "server-only";

import { cookies } from "next/headers";
import { SESSION_COOKIE, type CurrentUser } from "./session";

const apiUrl = process.env.INTERNAL_API_URL ?? "http://localhost:3333";

export async function apiFetch(path: string, init?: RequestInit) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const response = await apiFetch("/v1/auth/me");
  if (!response.ok) return null;
  return response.json() as Promise<CurrentUser>;
}
