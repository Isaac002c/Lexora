"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Download, LoaderCircle, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  AreaDocumentTemplate,
  DocumentFormField,
} from "./definitions";

interface DocumentFormDialogProps {
  template: AreaDocumentTemplate;
  defaults: Record<string, string>;
}

function formatDateForDocument(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function buildTemplateData(
  template: AreaDocumentTemplate,
  form: HTMLFormElement,
) {
  const values = new FormData(form);
  const data: Record<string, string> = {};

  for (const section of template.sections) {
    for (const field of section.fields) {
      if (field.type === "checkbox") {
        data[field.name] = values.has(field.name) ? "☒" : "☐";
        continue;
      }

      const raw = String(values.get(field.name) ?? "").trim();
      data[field.name] = field.type === "date" ? formatDateForDocument(raw) : raw;

      if (field.options) {
        for (const option of field.options) {
          if (option.tag) data[option.tag] = raw === option.value ? "☒" : "☐";
        }
      }

      if (field.name.endsWith("_other")) {
        data[`${field.name}_checked`] = raw ? "☒" : "☐";
      }
    }
  }

  return data;
}

function escapeDocumentText(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .replaceAll("\n", '</w:t><w:br/><w:t xml:space="preserve">');
}

function DocumentField({
  field,
  defaultValue,
}: {
  field: DocumentFormField;
  defaultValue?: string;
}) {
  const id = useId();
  const containerClass = field.wide ? "md:col-span-2" : "";

  if (field.type === "checkbox") {
    return (
      <label
        htmlFor={id}
        className={`${containerClass} hover:bg-muted/40 flex cursor-pointer items-start gap-3 rounded-lg border p-3`}
      >
        <input
          id={id}
          name={field.name}
          type="checkbox"
          defaultChecked={defaultValue === "true"}
          className="accent-primary mt-0.5 h-4 w-4"
        />
        <span className="text-sm leading-5">{field.label}</span>
      </label>
    );
  }

  return (
    <div className={containerClass}>
      <Label htmlFor={id}>{field.label}</Label>
      {field.type === "textarea" ? (
        <Textarea
          id={id}
          name={field.name}
          defaultValue={defaultValue}
          placeholder={field.placeholder}
          className="mt-1 min-h-24"
        />
      ) : field.type === "select" ? (
        <select
          id={id}
          name={field.name}
          defaultValue={defaultValue ?? ""}
          className="border-input bg-background ring-offset-background focus-visible:ring-ring mt-1 flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <Input
          id={id}
          name={field.name}
          type={field.type ?? "text"}
          defaultValue={defaultValue}
          placeholder={field.placeholder}
          className="mt-1"
          autoComplete={field.type === "password" ? "new-password" : undefined}
        />
      )}
      {field.help && (
        <p className="text-muted-foreground mt-1 text-xs">{field.help}</p>
      )}
    </div>
  );
}

export function DocumentFormDialog({
  template,
  defaults,
}: DocumentFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string>();
  const formRef = useRef<HTMLFormElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !generating) setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [generating, open]);

  async function generateDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const templateData = buildTemplateData(template, event.currentTarget);
    setError(undefined);
    setGenerating(true);
    try {
      const response = await fetch(template.templateHref, { cache: "no-store" });
      if (!response.ok) throw new Error("O modelo Word não pôde ser carregado.");

      const { default: PizZip } = await import("pizzip");
      const zip = new PizZip(await response.arrayBuffer());
      const documentFile = zip.file("word/document.xml");
      if (!documentFile) throw new Error("O modelo Word está incompleto.");
      let documentXml = documentFile.asText();
      for (const [tag, value] of Object.entries(templateData)) {
        documentXml = documentXml
          .split(`{{${tag}}}`)
          .join(escapeDocumentText(value));
      }
      documentXml = documentXml.replace(/\{\{[^{}]+\}\}/g, "");
      zip.file("word/document.xml", documentXml);
      const blob = zip.generate({
        type: "blob",
        compression: "DEFLATE",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = template.downloadName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (caught) {
      console.error(caught);
      setError(
        "Não foi possível gerar o documento. Revise os dados e tente novamente.",
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        Preencher e baixar
      </Button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 md:p-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !generating) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="bg-background flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b p-4 md:p-6">
              <div>
                <h2 id={titleId} className="text-xl font-semibold">
                  {template.title}
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Confira os dados e gere o arquivo Word preenchido.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="Fechar formulário"
                disabled={generating}
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form
              ref={formRef}
              onSubmit={generateDocument}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex-1 space-y-3 overflow-y-auto p-4 md:p-6">
                <div className="border-primary/20 bg-primary/5 text-muted-foreground flex gap-2 rounded-lg border p-3 text-xs">
                  <ShieldCheck className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    O preenchimento e a geração acontecem neste navegador. Os
                    dados digitados aqui não são gravados pelo Lexora.
                  </p>
                </div>
                {template.sections.map((section, index) => (
                  <details
                    key={section.title}
                    open={index === 0}
                    className="group rounded-lg border"
                  >
                    <summary className="hover:bg-muted/50 cursor-pointer list-none rounded-lg px-4 py-3 font-medium">
                      {section.title}
                      {section.description && (
                        <span className="text-muted-foreground ml-2 text-xs font-normal">
                          {section.description}
                        </span>
                      )}
                    </summary>
                    <div className="grid gap-4 border-t p-4 md:grid-cols-2">
                      {section.fields.map((field) => (
                        <DocumentField
                          key={field.name}
                          field={field}
                          defaultValue={defaults[field.name]}
                        />
                      ))}
                    </div>
                  </details>
                ))}
                {error && (
                  <p role="alert" className="text-destructive text-sm">
                    {error}
                  </p>
                )}
              </div>
              <div className="bg-background flex flex-col-reverse gap-2 border-t p-4 sm:flex-row sm:justify-end md:px-6">
                <Button
                  type="button"
                  variant="outline"
                  disabled={generating}
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={generating}>
                  {generating ? (
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {generating ? "Gerando Word..." : "Baixar Word preenchido"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
