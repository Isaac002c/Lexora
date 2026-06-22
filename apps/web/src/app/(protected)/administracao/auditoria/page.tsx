import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { formatDate } from "@/lib/format";
import { fetchData } from "@/lib/page-data";

interface AuditList {
  items: Array<{
    id: string;
    action: string;
    description: string;
    entityType: string;
    entityId: string;
    createdAt: string;
    actor?: { name: string };
  }>;
}
export default async function AuditPage() {
  const data = await fetchData<AuditList>("/v1/admin/audit");
  return (
    <>
      <PageHeader
        eyebrow="Últimos 100 eventos"
        title="Auditoria"
        description="Ações relevantes registradas dentro do tenant."
      />
      <DataTable
        columns={["Data", "Usuário", "Ação", "Entidade", "Descrição"]}
        rows={data.items.map((item) => [
          formatDate(item.createdAt, true),
          item.actor?.name ?? "Sistema",
          item.action,
          item.entityType,
          item.description,
        ])}
      />
    </>
  );
}
