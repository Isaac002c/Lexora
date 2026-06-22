import { changePasswordSchema } from "@chronostek/contracts";
import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/server-api";

export async function POST(request: Request) {
  const parsed = changePasswordSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ title: "Dados inválidos", errors: parsed.error.flatten().fieldErrors }, { status: 422 });
  const upstream = await apiFetch("/v1/auth/change-password", { method: "POST", body: JSON.stringify(parsed.data) });
  return NextResponse.json(await upstream.json(), { status: upstream.status });
}
