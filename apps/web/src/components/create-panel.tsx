"use client";

import { LoaderCircle, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { DateField } from "./date-field";

export interface FormField {
  name: string;
  label: string;
  type?:
    | "text"
    | "email"
    | "password"
    | "date"
    | "datetime-local"
    | "number"
    | "textarea"
    | "select"
    | "multiselect"
    | "checkbox";
  required?: boolean;
  options?: Array<{ value: string; label: string; parent?: string }>;
  defaultValue?: string | number | boolean | string[];
  placeholder?: string;
  // Select dependente (opt-in): filtra as opções pelo valor de outro campo,
  // comparando `option.parent` com o valor atual de `dependsOn`. Usado para
  // mostrar apenas clientes da filial selecionada (evita o erro cliente/filial).
  dependsOn?: string;
  dependsOnHint?: string;
}

export function CreatePanel({
  title,
  endpoint,
  fields,
  method = "POST",
  buttonLabel = "Novo registro",
}: {
  title: string;
  endpoint: string;
  fields: FormField[];
  method?: "POST" | "PATCH";
  buttonLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  // Valores de campos que controlam selects dependentes (ex.: filial → clientes).
  const [filters, setFilters] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of fields)
      if (typeof field.defaultValue === "string") initial[field.name] = field.defaultValue;
    return initial;
  });
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(undefined);
    const data = new FormData(event.currentTarget);
    const body: Record<string, unknown> = {};
    for (const field of fields) {
      if (field.type === "checkbox")
        body[field.name] = data.get(field.name) === "on";
      else if (field.type === "multiselect")
        body[field.name] = data.getAll(field.name).map(String);
      else {
        const value = data.get(field.name)?.toString();
        if (value)
          body[field.name] = field.type === "number" ? Number(value) : value;
      }
    }
    const response = await fetch(endpoint, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const problem = (await response.json().catch(() => ({}))) as {
        detail?: string;
        title?: string;
      };
      setError(problem.detail ?? problem.title ?? "Não foi possível salvar.");
      setSaving(false);
      return;
    }
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      {
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {buttonLabel}
        </Button>
      }
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-card max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border shadow-2xl">
            <div className="flex items-center justify-between border-b p-5">
              <h2 className="text-lg font-semibold">{title}</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
              >
                <X />
              </Button>
            </div>
            <form onSubmit={submit} className="grid gap-4 p-5 sm:grid-cols-2">
              {fields.map((field) => (
                <div
                  key={field.name}
                  className={
                    field.type === "textarea"
                      ? "space-y-2 sm:col-span-2"
                      : "space-y-2"
                  }
                >
                  <Label htmlFor={field.name}>{field.label}</Label>
                  {field.type === "textarea" ? (
                    <Textarea
                      id={field.name}
                      name={field.name}
                      required={field.required}
                      defaultValue={String(field.defaultValue ?? "")}
                    />
                  ) : field.type === "select" || field.type === "multiselect" ? (
                    <select
                      key={field.dependsOn ? `${field.name}:${filters[field.dependsOn] ?? ""}` : field.name}
                      id={field.name}
                      name={field.name}
                      multiple={field.type === "multiselect"}
                      required={field.required}
                      defaultValue={field.type === "multiselect" ? (Array.isArray(field.defaultValue) ? field.defaultValue : []) : String(field.defaultValue ?? "")}
                      onChange={(event) => setFilters((prev) => ({ ...prev, [field.name]: event.target.value }))}
                      className={field.type === "multiselect" ? "border-input bg-background min-h-28 w-full rounded-md border px-3 py-2 text-sm" : "border-input bg-background h-10 w-full rounded-md border px-3 text-sm"}
                    >
                      {field.type !== "multiselect" && (
                        <option value="">
                          {field.dependsOn && !filters[field.dependsOn] ? (field.dependsOnHint ?? "Selecione") : "Selecione"}
                        </option>
                      )}
                      {(field.dependsOn
                        ? (field.options ?? []).filter((option) => option.parent === filters[field.dependsOn!])
                        : field.options
                      )?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "checkbox" ? (
                    <Input
                      id={field.name}
                      name={field.name}
                      type="checkbox"
                      defaultChecked={Boolean(field.defaultValue)}
                      className="h-5 w-5"
                    />
                  ) : field.type === "date" ? (
                    <DateField
                      name={field.name}
                      required={field.required}
                      defaultValue={typeof field.defaultValue === "string" ? field.defaultValue : undefined}
                    />
                  ) : (
                    <Input
                      id={field.name}
                      name={field.name}
                      type={field.type ?? "text"}
                      required={field.required}
                      defaultValue={String(field.defaultValue ?? "")}
                      placeholder={field.placeholder}
                      step={field.type === "number" ? "0.01" : undefined}
                    />
                  )}
                </div>
              ))}
              {error && (
                <p className="rounded-md bg-red-500/10 p-3 text-sm text-red-400 sm:col-span-2">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </Button>
                <Button disabled={saving}>
                  {saving && (
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Salvar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
