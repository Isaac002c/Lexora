import Link from "next/link";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { fetchData } from "@/lib/page-data";

interface ChecklistList {
  items: Array<{
    id: string;
    name: string;
    case: { id: string; caseType: string; processNumber?: string; parties: Array<{ client: { name: string } }> };
    items: Array<{ id: string; title: string; status: string; notes?: string }>;
  }>;
}

export default async function ChecklistIssuesPage() {
  const data = await fetchData<ChecklistList>("/v1/checklists/cases");
  const issues = data.items.flatMap((checklist) =>
    checklist.items
      .filter((item) => ["PENDENTE", "RECUSADO"].includes(item.status))
      .map((item) => ({ ...item, checklistName: checklist.name, case: checklist.case })),
  );

  return (
    <>
      <PageHeader
        eyebrow={`${issues.length} itens requerem atenção`}
        title="Pendências documentais"
        description="Itens ainda não recebidos ou recusados nos checklists dos processos."
      />
      <DataTable
        columns={["Documento", "Checklist", "Cliente", "Processo", "Status", "Observação"]}
        rows={issues.map((item) => [
          item.title,
          item.checklistName,
          item.case.parties[0]?.client.name ?? "—",
          <Link key={item.id} href={`/processos/${item.case.id}`} className="text-cyan-500 hover:underline">{item.case.processNumber ?? item.case.caseType}</Link>,
          <StatusBadge key={`status-${item.id}`} value={item.status} />,
          item.notes ?? "—",
        ])}
      />
    </>
  );
}
