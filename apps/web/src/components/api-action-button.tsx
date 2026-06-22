"use client";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "./ui/button";

export function ApiActionButton({ endpoint, body, label, confirmMessage, variant = "outline", method = "POST" }: { endpoint: string; body: Record<string, unknown>; label: string; confirmMessage?: string; variant?: "outline" | "default" | "ghost"; method?: "POST" | "PATCH" }) {
  const [loading, setLoading] = useState(false); const router = useRouter();
  async function run() { if (confirmMessage && !window.confirm(confirmMessage)) return; setLoading(true); const response = await fetch(endpoint, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); setLoading(false); if (!response.ok) { const data = await response.json().catch(() => ({})) as { detail?: string; title?: string }; window.alert(data.detail ?? data.title ?? "Não foi possível concluir a ação."); return; } router.refresh(); }
  return <Button type="button" size="sm" variant={variant} disabled={loading} onClick={run}>{loading && <LoaderCircle className="mr-1 h-3 w-3 animate-spin" />}{label}</Button>;
}
