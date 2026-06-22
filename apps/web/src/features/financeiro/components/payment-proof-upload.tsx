"use client";
import { FileUp, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PaymentProofUpload({ installmentId }: { installmentId: string }) {
  const router = useRouter(); const [file, setFile] = useState<File>(); const [saving, setSaving] = useState(false); const [error, setError] = useState<string>();
  async function upload() { if (!file) return; setSaving(true); setError(undefined); const body = new FormData(); body.set("file", file); const response = await fetch(`/api/v1/finance/installments/${installmentId}/proof`, { method: "POST", body }); setSaving(false); if (!response.ok) { const problem = await response.json().catch(() => ({})) as { detail?: string; title?: string }; setError(problem.detail ?? problem.title ?? "Falha no comprovante."); return; } router.refresh(); }
  return <div className="flex min-w-56 flex-col gap-2"><Input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(event) => setFile(event.target.files?.[0])} /><Button size="sm" disabled={!file || saving} onClick={upload}>{saving ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}Anexar</Button>{error && <p className="text-xs text-red-400">{error}</p>}</div>;
}
