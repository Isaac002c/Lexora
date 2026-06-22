import { CreatePanel } from "@/components/create-panel";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { fetchData } from "@/lib/page-data";

interface Overview {
  legalAreas: Array<{
    id: string;
    name: string;
    code: string;
    description?: string;
    isActive: boolean;
    _count?: { cases: number; checklistTemplates: number };
  }>;
}
export default async function LegalAreasPage() {
  const data = await fetchData<Overview>("/v1/admin/overview");
  return (
    <>
      <PageHeader
        eyebrow={`${data.legalAreas.length} áreas`}
        title="Áreas jurídicas"
        description="Organização das áreas de atuação e modelos documentais."
        action={
          <CreatePanel
            title="Nova área jurídica"
            endpoint="/api/v1/admin/legal-areas"
            buttonLabel="Nova área"
            fields={[
              { name: "name", label: "Nome", required: true },
              { name: "description", label: "Descrição", type: "textarea" },
            ]}
          />
        }
      />
      <DataTable
        columns={[
          "Código",
          "Área",
          "Descrição",
          "Processos",
          "Modelos",
          "Situação",
          "Ações",
        ]}
        rows={data.legalAreas.map((item) => [
          item.code,
          item.name,
          item.description ?? "—",
          item._count?.cases ?? "—",
          item._count?.checklistTemplates ?? "—",
          <StatusBadge
            key={item.id}
            value={item.isActive ? "ACTIVE" : "INACTIVE"}
          />,
          <CreatePanel key={`edit-${item.id}`} title={`Editar ${item.name}`} endpoint={`/api/v1/admin/legal-areas/${item.id}`} method="PATCH" buttonLabel="Editar" fields={[{ name: "name", label: "Nome", required: true, defaultValue: item.name }, { name: "description", label: "Descrição", type: "textarea", defaultValue: item.description }, { name: "isActive", label: "Área ativa", type: "checkbox", defaultValue: item.isActive }]} />,
        ])}
      />
    </>
  );
}
