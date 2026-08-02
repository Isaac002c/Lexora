"use client";

import { ArrowRight, LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Lookups } from "@/lib/page-data";
import { userOptionLabel } from "@/lib/user-options";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function AttendanceConvertPanel({ id, branchId, legalAreaId, lookups }: { id: string; branchId: string; legalAreaId?: string; lookups: Lookups }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(undefined);
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/v1/attendances/${id}/convert`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        createClient: true,
        createCase: true,
        case: {
          branchId,
          legalAreaId,
          caseName: form.get("caseName") || undefined,
          caseType: form.get("caseType"),
          processNumber: form.get("processNumber") || undefined,
          opposingParty: form.get("opposingParty") || undefined,
          entryDate: form.get("entryDate"),
          responsibleUserIds: form.getAll("responsibleUserIds"),
          attorneyId: form.get("attorneyId") || undefined,
        },
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({})) as { detail?: string; title?: string };
      setError(data.detail ?? data.title ?? "Falha na conversão.");
      setSaving(false);
      return;
    }
    setOpen(false);
    setSaving(false);
    router.refresh();
  }

  if (!legalAreaId) return <span className="text-xs text-muted-foreground">Defina a área</span>;
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}><ArrowRight className="mr-1 h-3 w-3" />Converter</Button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <form onSubmit={submit} className="grid max-h-[90vh] w-full max-w-2xl gap-4 overflow-y-auto rounded-xl border bg-card p-6 sm:grid-cols-2">
            <div className="flex items-center justify-between sm:col-span-2"><h2 className="font-semibold">Gerar cliente e processo</h2><Button type="button" size="icon" variant="ghost" onClick={() => setOpen(false)}><X /></Button></div>
            <div className="space-y-2 sm:col-span-2"><Label>Nome do processo</Label><Input name="caseName" placeholder="Identificação interna amigável" /></div>
            <div className="space-y-2"><Label>Tipo</Label><Input name="caseType" required /></div>
            <div className="space-y-2"><Label>Número do processo</Label><Input name="processNumber" /></div>
            <div className="space-y-2"><Label>Parte contrária</Label><Input name="opposingParty" /></div>
            <div className="space-y-2"><Label>Data de entrada</Label><Input name="entryDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Responsáveis internos</Label>
              <select name="responsibleUserIds" multiple required className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm">
                {lookups.users.map((user) => <option key={user.id} value={user.id}>{userOptionLabel(user)}</option>)}
              </select>
              <p className="text-xs text-muted-foreground">Use Ctrl ou Cmd para selecionar Carla, Rodolfo ou ambos.</p>
            </div>
            <div className="space-y-2 sm:col-span-2"><Label>Advogado responsável</Label><select name="attorneyId" className="h-10 w-full rounded-md border bg-background px-3"><option value="">Selecione</option>{lookups.users.filter((user) => user.roleCodes?.includes("ADVOGADO")).map((user) => <option key={user.id} value={user.id}>{userOptionLabel(user)}</option>)}</select></div>
            {error && <p className="text-sm text-red-400 sm:col-span-2">{error}</p>}
            <Button disabled={saving} className="sm:col-span-2">{saving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}Converter atendimento</Button>
          </form>
        </div>
      )}
    </>
  );
}
