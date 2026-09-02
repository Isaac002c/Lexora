import { Download, FilePenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DocumentFormDialog } from "@/features/processos/document-forms/document-form-dialog";
import { templatesByArea } from "@/features/processos/document-forms/definitions";

export function CaseAreaForms({
  areaCode,
  areaName,
  defaults,
}: {
  areaCode: string;
  areaName: string;
  defaults: Record<string, string>;
}) {
  const templates = templatesByArea[areaCode] ?? [];
  if (templates.length === 0) return null;

  return (
    <section className="mb-6" aria-labelledby="case-area-forms-title">
      <div className="mb-3">
        <h2 id="case-area-forms-title" className="text-lg font-semibold">
          Formulários da área
        </h2>
        <p className="text-muted-foreground text-sm">
          Preencha no sistema e baixe o Word pronto para processos de {areaName}.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((template) => (
          <Card key={template.id} className="flex h-full flex-col">
            <CardHeader className="flex-row items-start gap-3 space-y-0 pb-3">
              <span className="bg-primary/10 text-primary rounded-lg p-2">
                <FilePenLine className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-base">{template.title}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="mt-auto flex flex-wrap gap-2">
              <DocumentFormDialog template={template} defaults={defaults} />
              <Button asChild variant="outline" size="sm">
                <a href={template.sourceHref} download>
                  <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                  Modelo em branco
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
