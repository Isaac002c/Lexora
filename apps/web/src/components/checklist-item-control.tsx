"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// #3 — Estados do item de checklist (mapeados ao enum existente, sem migration).
const STATUS_OPTIONS = [
  { value: "PENDENTE", label: "Pendente" },
  { value: "RECEBIDO", label: "Recebido" },
  { value: "ANALISADO", label: "Analisado" },
  { value: "RECUSADO", label: "Solicitar novamente" },
  { value: "NAO_SE_APLICA", label: "Não se aplica" },
];

export function ChecklistItemControl({
  itemId,
  title,
  status,
  notes,
  canManage,
}: {
  itemId: string;
  title: string;
  status: string;
  notes?: string;
  canManage: boolean;
}) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [note, setNote] = useState(notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const router = useRouter();

  async function save(nextStatus: string, nextNote: string) {
    setSaving(true);
    setError(undefined);
    const response = await fetch(`/api/v1/checklists/items/${itemId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: nextStatus, notes: nextNote || undefined }),
    });
    setSaving(false);
    if (!response.ok) {
      setError("Não foi possível salvar o item.");
      return;
    }
    router.refresh();
  }

  if (!canManage) {
    return (
      <div className="flex items-center justify-between gap-2 border-b py-2 text-sm">
        <span>{title}</span>
        <span className="text-muted-foreground text-xs">
          {STATUS_OPTIONS.find((option) => option.value === currentStatus)?.label ?? currentStatus}
        </span>
      </div>
    );
  }

  return (
    <div className="border-b py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{title}</span>
        <select
          value={currentStatus}
          disabled={saving}
          onChange={(event) => {
            setCurrentStatus(event.target.value);
            void save(event.target.value, note);
          }}
          className="border-input bg-background h-8 rounded-md border px-2 text-xs"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-1 flex gap-2">
        <input
          value={note}
          disabled={saving}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Nota do item (opcional)"
          className="border-input bg-background h-8 flex-1 rounded-md border px-2 text-xs"
        />
        <button
          type="button"
          disabled={saving}
          onClick={() => void save(currentStatus, note)}
          className="rounded-md border px-3 text-xs"
        >
          Salvar nota
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
