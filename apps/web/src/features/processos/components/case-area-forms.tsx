import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AreaFormTemplate {
  title: string;
  description: string;
  href: string;
  downloadName: string;
}

const laborTemplates: AreaFormTemplate[] = [
  {
    title: "Ficha de atendimento trabalhista",
    description: "Ficha completa para o primeiro atendimento e estudo do caso.",
    href: "/formularios/trabalhista-ficha-atendimento.docx",
    downloadName: "Ficha de atendimento - Trabalhista.docx",
  },
  {
    title: "Lista de documentos trabalhistas",
    description: "Relação de documentos necessários e dados de testemunhas.",
    href: "/formularios/trabalhista-lista-documentos.docx",
    downloadName: "Lista de documentos - Trabalhista.docx",
  },
];

const civilTemplates: AreaFormTemplate[] = [
  {
    title: "Formulário de atendimento cível",
    description:
      "Formulário de triagem e avaliação inicial para demandas cíveis.",
    href: "/formularios/civel-formulario-atendimento.docx",
    downloadName: "Formulario de atendimento - Area civel.docx",
  },
  {
    title: "Checklist de documentos cíveis",
    description: "Documentos gerais e específicos para o ajuizamento da ação.",
    href: "/formularios/civel-lista-documentos.docx",
    downloadName: "Checklist de documentos - Area civel.docx",
  },
];

const socialSecurityTemplates: AreaFormTemplate[] = [
  {
    title: "Formulário de atendimento previdenciário",
    description:
      "Triagem previdenciária para demandas administrativas e federais.",
    href: "/formularios/previdenciario-federal-formulario-atendimento.docx",
    downloadName: "Formulario de atendimento - Previdenciario e Federal.docx",
  },
];

const templatesByArea: Record<string, AreaFormTemplate[]> = {
  TRABALHISTA: laborTemplates,
  CIVEL: civilTemplates,
  JUIZADO_CIVEL: civilTemplates,
  VARA_CIVEL: civilTemplates,
  PREVIDENCIARIO: socialSecurityTemplates,
  FEDERAL: socialSecurityTemplates,
};

export function CaseAreaForms({
  areaCode,
  areaName,
}: {
  areaCode: string;
  areaName: string;
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
          Modelos em Word disponíveis para processos de {areaName}.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((template) => (
          <Card key={template.href} className="flex h-full flex-col">
            <CardHeader className="flex-row items-start gap-3 space-y-0 pb-3">
              <span className="bg-primary/10 text-primary rounded-lg p-2">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-base">{template.title}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button asChild variant="outline" size="sm">
                <a href={template.href} download={template.downloadName}>
                  <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                  Baixar DOCX
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
