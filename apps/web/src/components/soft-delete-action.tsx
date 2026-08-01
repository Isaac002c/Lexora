"use client";

import { LoaderCircle, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "./ui/button";

export function SoftDeleteAction({ endpoint, restore = false, label }: { endpoint: string; restore?: boolean; label?: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function run() {
    const reason = window.prompt(restore ? "Informe o motivo da restauração:" : "Informe o motivo da exclusão:");
    if (reason === null) return;
    if (reason.trim().length < 3) {
      window.alert("Informe um motivo com pelo menos 3 caracteres.");
      return;
    }
    if (!restore && !window.confirm("O registro sairá das listas operacionais e poderá ser restaurado. Continuar?")) return;
    setLoading(true);
    const response = await fetch(endpoint, {
      method: restore ? "POST" : "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() }),
    });
    setLoading(false);
    if (!response.ok) {
      const problem = await response.json().catch(() => ({})) as { detail?: string; title?: string };
      window.alert(problem.detail ?? problem.title ?? "Não foi possível concluir a ação.");
      return;
    }
    router.refresh();
  }

  const Icon = restore ? RotateCcw : Trash2;
  return (
    <Button type="button" size="sm" variant="outline" disabled={loading} onClick={run}>
      {loading ? <LoaderCircle className="mr-1 h-3 w-3 animate-spin" /> : <Icon className="mr-1 h-3 w-3" />}
      {label ?? (restore ? "Restaurar" : "Excluir")}
    </Button>
  );
}
