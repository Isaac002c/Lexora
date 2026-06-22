import { CreatePanel } from "@/components/create-panel";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { fetchData } from "@/lib/page-data";

interface Overview {
  branches: Array<{
    id: string;
    name: string;
    code: string;
    email?: string;
    phone?: string;
    isActive: boolean;
    _count?: { userAccesses: number; clients: number; cases: number };
  }>;
}
export default async function BranchesPage() {
  const data = await fetchData<Overview>("/v1/admin/overview");
  return (
    <>
      <PageHeader
        eyebrow={`${data.branches.length} unidades`}
        title="Filiais"
        description="Unidades operacionais e seus vínculos dentro do tenant."
        action={
          <CreatePanel
            title="Nova filial"
            endpoint="/api/v1/admin/branches"
            buttonLabel="Nova filial"
            fields={[
              { name: "name", label: "Nome", required: true },
              { name: "code", label: "Código", required: true },
              { name: "email", label: "E-mail", type: "email" },
              { name: "phone", label: "Telefone" },
            ]}
          />
        }
      />
      <DataTable
        columns={[
          "Código",
          "Filial",
          "Contato",
          "Usuários",
          "Clientes",
          "Processos",
          "Situação",
          "Ações",
        ]}
        rows={data.branches.map((item) => [
          item.code,
          item.name,
          item.email ?? item.phone ?? "—",
          item._count?.userAccesses ?? "—",
          item._count?.clients ?? "—",
          item._count?.cases ?? "—",
          <StatusBadge
            key={item.id}
            value={item.isActive ? "ACTIVE" : "INACTIVE"}
          />,
          <CreatePanel key={`edit-${item.id}`} title={`Editar ${item.name}`} endpoint={`/api/v1/admin/branches/${item.id}`} method="PATCH" buttonLabel="Editar" fields={[{ name: "name", label: "Nome", required: true, defaultValue: item.name }, { name: "code", label: "Código", required: true, defaultValue: item.code }, { name: "email", label: "E-mail", type: "email", defaultValue: item.email }, { name: "phone", label: "Telefone", defaultValue: item.phone }, { name: "isActive", label: "Filial ativa", type: "checkbox", defaultValue: item.isActive }]} />,
        ])}
      />
    </>
  );
}
