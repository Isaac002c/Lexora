import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ChecklistTemplateForm } from "@/features/checklists/components/checklist-template-form";
import { fetchData, type Lookups } from "@/lib/page-data";

interface TemplateList {
  items: Array<{
    id: string;
    name: string;
    legalAreaId: string;
    caseType?: string;
    isActive: boolean;
    legalArea: { name: string };
    items: Array<{ id: string; title: string; isRequired: boolean }>;
  }>;
}

export default async function ChecklistTemplatesPage() {
  const [data, lookups] = await Promise.all([
    fetchData<TemplateList>("/v1/checklists/templates?all=true"),
    fetchData<Lookups>("/v1/lookups"),
  ]);

  return (
    <>
      <PageHeader
        eyebrow={`${data.items.length} modelos`}
        title="Modelos de checklist"
        description="Padronize os documentos exigidos por área e tipo de processo."
        action={<ChecklistTemplateForm areas={lookups.legalAreas} />}
      />
      <div className="grid gap-4 xl:grid-cols-2">
        {data.items.map((template) => (
          <article key={template.id} className="rounded-xl border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold">{template.name}</h2>
                <p className="text-muted-foreground text-sm">
                  {template.legalArea.name}
                  {template.caseType ? ` · ${template.caseType}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge value={template.isActive ? "ACTIVE" : "ARCHIVED"} />
                <ChecklistTemplateForm areas={lookups.legalAreas} template={template} />
              </div>
            </div>
            <ol className="mt-4 grid gap-2 text-sm">
              {template.items.map((item, index) => (
                <li key={item.id} className="rounded-md bg-muted/50 px-3 py-2">
                  {index + 1}. {item.title}
                  {!item.isRequired && <span className="text-muted-foreground"> (opcional)</span>}
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
      {!data.items.length && (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          Nenhum modelo cadastrado.
        </div>
      )}
    </>
  );
}
