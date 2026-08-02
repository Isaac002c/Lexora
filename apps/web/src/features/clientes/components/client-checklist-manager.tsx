"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChecklistItemControl } from "@/components/checklist-item-control";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ChecklistData {
  id: string;
  name: string;
  items: Array<{ id: string; title: string; status: string; notes?: string }>;
}

export function ClientChecklistManager({ clientId, checklists, canManage }: { clientId: string; checklists: ChecklistData[]; canManage: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [itemsText, setItemsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  async function createChecklist(event: React.FormEvent) {
    event.preventDefault();
    const items = itemsText.split(/\r?\n/).map((title) => title.trim()).filter(Boolean).map((title) => ({ title, isRequired: true }));
    if (!name.trim() || !items.length) {
      setError("Informe o nome e ao menos um item, um por linha.");
      return;
    }
    setSaving(true);
    setError(undefined);
    const response = await fetch(`/api/v1/checklists/clients/${clientId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, items }),
    });
    setSaving(false);
    if (!response.ok) {
      const problem = await response.json().catch(() => ({})) as { detail?: string; title?: string };
      setError(problem.detail ?? problem.title ?? "Não foi possível criar o checklist.");
      return;
    }
    setName("");
    setItemsText("");
    router.refresh();
  }

  return <div className="space-y-5">
    {canManage && <form onSubmit={createChecklist} className="grid gap-3 rounded-lg border bg-card p-5">
      <div><h2 className="font-semibold">Novo checklist do cliente</h2><p className="mt-1 text-sm text-muted-foreground">Use uma linha para cada documento, confirmação ou providência.</p></div>
      <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome do checklist" />
      <Textarea value={itemsText} onChange={(event) => setItemsText(event.target.value)} placeholder={"Documento de identificação\nComprovante de endereço\nContrato assinado"} rows={6} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div><Button disabled={saving}>{saving ? "Salvando..." : "Criar checklist"}</Button></div>
    </form>}
    {checklists.map((checklist) => <section key={checklist.id} className="rounded-lg border bg-card p-5">
      <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">{checklist.name}</h2><span className="text-xs text-muted-foreground">{checklist.items.filter((item) => ["RECEBIDO", "ANALISADO", "NAO_SE_APLICA"].includes(item.status)).length}/{checklist.items.length} concluídos</span></div>
      {checklist.items.map((item) => <ChecklistItemControl key={item.id} itemId={item.id} title={item.title} status={item.status} notes={item.notes} canManage={canManage} endpoint={`/api/v1/checklists/client-items/${item.id}`} />)}
    </section>)}
    {!checklists.length && <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhum checklist foi criado para este cliente.</div>}
  </div>;
}
