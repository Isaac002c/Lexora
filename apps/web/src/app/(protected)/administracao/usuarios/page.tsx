import { CreatePanel } from "@/components/create-panel";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";
import { fetchData } from "@/lib/page-data";

interface Overview {
  users: Array<{
    id: string;
    name: string;
    email: string;
    status: string;
    lastLoginAt?: string;
    hasAllBranches: boolean;
    roles: Array<{ role: { code: string; name: string } }>;
    branchAccesses: Array<{ branch: { id: string; name: string } }>;
  }>;
  branches: Array<{ id: string; name: string }>;
  roles: Array<{ code: string; name: string }>;
}

export default async function UsersPage() {
  const data = await fetchData<Overview>("/v1/admin/overview");
  return (
    <>
      <PageHeader
        eyebrow={`${data.users.length} contas`}
        title="Usuários"
        description="Perfis, escopo de filiais, situação e último acesso."
        action={
          <CreatePanel
            title="Novo usuário"
            endpoint="/api/v1/admin/users"
            buttonLabel="Novo usuário"
            fields={[
              { name: "name", label: "Nome", required: true },
              { name: "email", label: "E-mail", type: "email", required: true },
              {
                name: "roleCode",
                label: "Perfil",
                type: "select",
                required: true,
                options: data.roles.map((item) => ({
                  value: item.code,
                  label: item.name,
                })),
              },
              {
                name: "branchIds",
                label: "Filiais permitidas",
                type: "multiselect",
                options: data.branches.map((item) => ({
                  value: item.id,
                  label: item.name,
                })),
              },
              {
                name: "hasAllBranches",
                label: "Acesso a todas as filiais",
                type: "checkbox",
              },
              {
                name: "temporaryPassword",
                label: "Senha temporária",
                type: "password",
                required: true,
              },
            ]}
          />
        }
      />
      <DataTable
        columns={[
          "Nome",
          "E-mail",
          "Perfil",
          "Filiais",
          "Último acesso",
          "Status",
          "Ações",
        ]}
        rows={data.users.map((item) => [
          item.name,
          item.email,
          item.roles.map(({ role }) => role.name).join(", "),
          item.hasAllBranches
            ? "Todas"
            : item.branchAccesses.map(({ branch }) => branch.name).join(", "),
          item.lastLoginAt ? formatDate(item.lastLoginAt, true) : "Nunca",
          <StatusBadge key={item.id} value={item.status} />,
          <div key={`actions-${item.id}`} className="flex flex-wrap gap-2">
            <CreatePanel
              title={`Editar ${item.name}`}
              endpoint={`/api/v1/admin/users/${item.id}`}
              method="PATCH"
              buttonLabel="Editar"
              fields={[
                { name: "name", label: "Nome", required: true, defaultValue: item.name },
                { name: "email", label: "E-mail", type: "email", required: true, defaultValue: item.email },
                { name: "roleCode", label: "Perfil", type: "select", required: true, defaultValue: item.roles[0]?.role.code, options: data.roles.map((role) => ({ value: role.code, label: role.name })) },
                { name: "branchIds", label: "Filiais permitidas", type: "multiselect", defaultValue: item.branchAccesses.map(({ branch }) => branch.id), options: data.branches.map((branch) => ({ value: branch.id, label: branch.name })) },
                { name: "hasAllBranches", label: "Acesso a todas as filiais", type: "checkbox", defaultValue: item.hasAllBranches },
                { name: "status", label: "Status", type: "select", required: true, defaultValue: item.status, options: [{ value: "ACTIVE", label: "Ativo" }, { value: "SUSPENDED", label: "Suspenso" }, { value: "ARCHIVED", label: "Arquivado" }] },
              ]}
            />
            <CreatePanel title={`Redefinir senha de ${item.name}`} endpoint={`/api/v1/admin/users/${item.id}/reset-password`} buttonLabel="Redefinir senha" fields={[{ name: "temporaryPassword", label: "Nova senha temporária", type: "password", required: true }]} />
          </div>,
        ])}
      />
    </>
  );
}
