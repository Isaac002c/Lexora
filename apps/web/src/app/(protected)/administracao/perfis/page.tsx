import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { fetchData } from "@/lib/page-data";

interface Overview {
  roles: Array<{
    code: string;
    name: string;
    description?: string;
    permissions?: Array<{ permission: { code: string; description: string } }>;
  }>;
}
export default async function RolesPage() {
  const data = await fetchData<Overview>("/v1/admin/overview");
  return (
    <>
      <PageHeader
        eyebrow="Matriz RBAC"
        title="Perfis e permissões"
        description="Visualização das capacidades concedidas a cada perfil do tenant."
      />
      <DataTable
        columns={["Perfil", "Código", "Permissões"]}
        rows={data.roles.map((role) => [
          role.name,
          role.code,
          <div key={role.code} className="flex max-w-3xl flex-wrap gap-1">
            {role.permissions?.map(({ permission }) => (
              <span
                key={permission.code}
                className="bg-muted rounded px-2 py-1 text-xs"
              >
                {permission.code}
              </span>
            )) ?? "—"}
          </div>,
        ])}
      />
    </>
  );
}
