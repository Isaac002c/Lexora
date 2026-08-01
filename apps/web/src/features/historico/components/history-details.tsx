"use client";

import { Eye, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

export interface HistoryRecord {
  id: string;
  actorName?: string | null;
  actorRoles: string[];
  module?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  changedFields?: string[] | null;
  reason?: string | null;
  origin?: string | null;
  correlationId?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

const FIELD_LABELS: Record<string, string> = {
  name: "Nome",
  status: "Status",
  email: "E-mail",
  phone: "Telefone",
  notes: "Observações",
  processNumber: "Número do processo",
  opposingParty: "Parte contrária",
  responsibleUserId: "Responsável",
  branchId: "Filial",
  legalAreaId: "Área jurídica",
  dueAt: "Vencimento",
  priority: "Prioridade",
  paidAt: "Data de pagamento",
};

function valueLabel(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return formatDate(value, true);
  if (Array.isArray(value)) return value.map(valueLabel).join(", ");
  if (typeof value === "object") return Object.entries(value as Record<string, unknown>).map(([key, entry]) => `${FIELD_LABELS[key] ?? key}: ${valueLabel(entry)}`).join(" · ");
  return String(value);
}

export function HistoryDetails({ record }: { record: HistoryRecord }) {
  const [open, setOpen] = useState(false);
  const fields = record.changedFields?.length
    ? record.changedFields
    : [...new Set([...Object.keys(record.beforeState ?? {}), ...Object.keys(record.afterState ?? {})])]
      .filter((field) => !["createdAt", "updatedAt"].includes(field));
  return <>
    <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={() => setOpen(true)}><Eye className="h-4 w-4" />Detalhes</Button>
    {open && <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Detalhes do evento de histórico">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg border bg-card shadow-2xl">
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b bg-card p-5">
          <div><p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">{record.module ?? record.entityType}</p><h2 className="mt-1 text-xl font-semibold">{record.description}</h2><p className="mt-1 text-sm text-muted-foreground">{formatDate(record.createdAt, true)} · {record.actorName ?? "Sistema"}</p></div>
          <Button variant="ghost" size="icon" aria-label="Fechar detalhes" onClick={() => setOpen(false)}><X /></Button>
        </div>
        <div className="space-y-6 p-5">
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div><dt className="text-muted-foreground">Ação</dt><dd className="mt-1 font-medium">{record.action}</dd></div>
            <div><dt className="text-muted-foreground">Entidade</dt><dd className="mt-1 font-medium">{record.entityType}</dd></div>
            <div><dt className="text-muted-foreground">Origem</dt><dd className="mt-1 font-medium">{record.origin ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Correlation ID</dt><dd className="mt-1 break-all font-mono text-xs">{record.correlationId ?? "—"}</dd></div>
          </dl>
          {record.reason && <div className="rounded-md border border-warning/30 bg-warning/10 p-4 text-sm"><p className="font-medium">Motivo</p><p className="mt-1 text-muted-foreground">{record.reason}</p></div>}
          <section>
            <h3 className="mb-3 font-semibold">Comparação por campo</h3>
            {fields.length ? <div className="overflow-x-auto rounded-md border"><table className="w-full min-w-[640px] text-left text-sm"><thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Campo</th><th className="px-4 py-3">Antes</th><th className="px-4 py-3">Depois</th></tr></thead><tbody className="divide-y">{fields.map((field) => <tr key={field}><th className="px-4 py-3 font-medium">{FIELD_LABELS[field] ?? field}</th><td className="max-w-xs px-4 py-3 text-muted-foreground">{valueLabel(record.beforeState?.[field])}</td><td className="max-w-xs px-4 py-3">{valueLabel(record.afterState?.[field])}</td></tr>)}</tbody></table></div> : <p className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">Este evento não possui comparação de campos porque foi registrado antes da auditoria estruturada ou não alterou dados da entidade.</p>}
          </section>
        </div>
      </div>
    </div>}
  </>;
}
