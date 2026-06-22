import Link from "next/link";
import { CreatePanel } from "@/components/create-panel";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { fetchData, type Lookups } from "@/lib/page-data";

interface TemplateList {
  items: Array<{ id: string; name: string }>;
}

interface ChecklistList {
  items: Array<{
    id: string;
    name: string;
    case: {
      id: string;
      caseType: string;
      processNumber?: string;
      parties: Array<{ client: { name: string } }>;
    };
    items: Array<{ id: string; title: string; status: string; notes?: string }>;
  }>;
}

const checklistStatuses = ["PENDENTE", "RECEBIDO", "ANALISADO", "RECUSADO", "NAO_SE_APLICA"];

export default async function CaseChecklistsPage() {
  const [templates, checklists, lookups] = await Promise.all([
    fetchData<TemplateList>("/v1/checklists/templates"),
    fetchData<ChecklistList>("/v1/checklists/cases"),
    fetchData<Lookups>("/v1/lookups"),
  ]);

  return (
    <>
      <PageHeader
        eyebrow={`${checklists.items.length} checklists aplicados`}
        title="Checklists por processo"
        description="Acompanhe documento por documento e mantenha as pendências visíveis."
        action={
          <CreatePanel
            title="Aplicar checklist"
            endpoint="/api/v1/checklists/cases"
            buttonLabel="Aplicar modelo"
            fields={[
              { name: "caseId", label: "Processo", type: "select", required: true, options: lookups.cases.map((item) => ({ value: item.id, label: item.name })) },
              { name: "templateId", label: "Modelo", type: "select", required: true, options: templates.items.map((item) => ({ value: item.id, label: item.name })) },
            ]}
          />
        }
      />
      <div className="grid gap-5">
        {checklists.items.map((checklist) => {
          const completed = checklist.items.filter((item) => ["RECEBIDO", "ANALISADO", "NAO_SE_APLICA"].includes(item.status)).length;
          return (
            <article key={checklist.id} className="rounded-xl border bg-card p-5">
              <div className="flex flex-col justify-between gap-3 border-b pb-4 sm:flex-row sm:items-center">
                <div>
                  <h2 className="font-semibold">{checklist.name}</h2>
                  <Link href={`/processos/${checklist.case.id}`} className="text-sm text-cyan-500 hover:underline">
                    {checklist.case.processNumber ?? checklist.case.caseType} · {checklist.case.parties[0]?.client.name ?? "Cliente não informado"}
                  </Link>
                </div>
                <span className="text-muted-foreground text-sm">{completed}/{checklist.items.length} concluídos</span>
              </div>
              <div className="mt-4 grid gap-3">
                {checklist.items.map((item) => (
                  <div key={item.id} className="flex flex-col justify-between gap-3 rounded-lg bg-muted/40 p-3 lg:flex-row lg:items-center">
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      {item.notes && <p className="text-muted-foreground mt-1 text-xs">{item.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge value={item.status} />
                      <CreatePanel
                        title={`Atualizar ${item.title}`}
                        endpoint={`/api/v1/checklists/items/${item.id}`}
                        method="PATCH"
                        buttonLabel="Atualizar"
                        fields={[
                          { name: "status", label: "Status", type: "select", required: true, defaultValue: item.status, options: checklistStatuses.map((value) => ({ value, label: value.replaceAll("_", " ") })) },
                          { name: "notes", label: "Observações", type: "textarea", defaultValue: item.notes },
                        ]}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
      {!checklists.items.length && (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          Nenhum checklist foi aplicado a um processo.
        </div>
      )}
    </>
  );
}
