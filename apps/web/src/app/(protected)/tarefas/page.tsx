import { ApiActionButton } from "@/components/api-action-button";
import { CreatePanel } from "@/components/create-panel";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { SearchForm } from "@/components/search-form";
import { SoftDeleteAction } from "@/components/soft-delete-action";
import { StatusBadge } from "@/components/status-badge";
import { ModuleNav } from "@/features/shared/components/module-nav";
import { formatDate } from "@/lib/format";
import { fetchData, type Lookups } from "@/lib/page-data";
import { getCurrentUser } from "@/lib/server-api";
import { userOptionLabel, userSelectOptions } from "@/lib/user-options";

interface TaskList {
  items: Array<{
    id: string;
    branchId?: string;
    clientId?: string;
    caseId?: string;
    legalAreaId?: string;
    assigneeId: string;
    title: string;
    description?: string;
    priority: string;
    dueAt?: string;
    status: string;
    deletedAt?: string;
    assigneeName: string;
    requesterName: string;
  }>;
  total: number;
  page: number;
  pageSize: number;
}
type Query = {
  search?: string;
  page?: string;
  status?: string;
  responsibleId?: string;
  deleted?: "exclude" | "only";
};
export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const query = await searchParams;
  const params = new URLSearchParams(
    Object.fromEntries(
      Object.entries(query).filter((x): x is [string, string] => Boolean(x[1])),
    ),
  );
  const [data, lookups, user] = await Promise.all([
    fetchData<TaskList>(`/v1/tasks?${params}`),
    fetchData<Lookups>("/v1/lookups"),
    getCurrentUser(),
  ]);
  const fields = [
    { name: "title", label: "Título", required: true },
    { name: "description", label: "Descrição", type: "textarea" as const },
    {
      name: "assigneeId",
      label: "Responsável",
      type: "select" as const,
      required: true,
      options: userSelectOptions(lookups.users),
    },
    {
      name: "branchId",
      label: "Filial",
      type: "select" as const,
      options: lookups.branches.map((x) => ({ value: x.id, label: x.name })),
    },
    {
      name: "clientId",
      label: "Cliente",
      type: "select" as const,
      options: lookups.clients.map((x) => ({ value: x.id, label: x.name })),
    },
    {
      name: "caseId",
      label: "Processo",
      type: "select" as const,
      options: lookups.cases.map((x) => ({ value: x.id, label: x.name })),
    },
    {
      name: "priority",
      label: "Prioridade",
      type: "select" as const,
      defaultValue: "NORMAL",
      options: ["BAIXA", "NORMAL", "ALTA", "URGENTE"].map((x) => ({
        value: x,
        label: x,
      })),
    },
    { name: "dueAt", label: "Vencimento", type: "datetime-local" as const },
  ];
  return (
    <>
      <PageHeader
        eyebrow={`${data.total} tarefas`}
        title="Tarefas"
        description="Trabalho jurídico vinculado ao cliente, processo e responsável."
        action={
          user?.permissions.includes("task.create") && (
            <CreatePanel
              title="Nova tarefa"
              endpoint="/api/v1/tasks"
              buttonLabel="Nova tarefa"
              fields={fields}
            />
          )
        }
      />
      <ModuleNav
        items={[
          { label: "Pendentes", href: "/tarefas" },
          { label: "Em andamento", href: "/tarefas?status=EM_ANDAMENTO" },
          { label: "Concluídas", href: "/tarefas?status=CONCLUIDA" },
          ...(user?.permissions.includes("task.restore")
            ? [{ label: "Excluídas", href: "/tarefas?deleted=only" }]
            : []),
        ]}
      />
      <SearchForm defaultValue={query.search} placeholder="Título da tarefa">
        <select
          name="responsibleId"
          defaultValue={query.responsibleId}
          className="bg-background h-10 rounded-md border px-3 text-sm"
        >
          <option value="">Todos os responsáveis</option>
          {lookups.users.map((x) => (
            <option key={x.id} value={x.id}>
              {userOptionLabel(x)}
            </option>
          ))}
        </select>
      </SearchForm>
      <DataTable
        columns={[
          "Tarefa",
          "Responsável",
          "Solicitante",
          "Vencimento",
          "Prioridade",
          "Status",
          "Ações",
        ]}
        rows={data.items.map((item) => [
          <span key={item.id}>
            <span className="block font-medium">{item.title}</span>
            <span className="text-muted-foreground line-clamp-1 text-xs">
              {item.description}
            </span>
          </span>,
          item.assigneeName,
          item.requesterName,
          item.dueAt ? formatDate(item.dueAt) : "Sem prazo",
          <StatusBadge key="priority" value={item.priority} />,
          <StatusBadge key="status" value={item.status} />,
          <div key="actions" className="flex gap-2">
            {!item.deletedAt &&
              user?.permissions.includes("task.update") &&
              (item.status === "CONCLUIDA" ? (
                <ApiActionButton
                  method="PATCH"
                  endpoint={`/api/v1/tasks/${item.id}`}
                  body={{ status: "PENDENTE" }}
                  label="Reabrir"
                />
              ) : (
                <ApiActionButton
                  method="PATCH"
                  endpoint={`/api/v1/tasks/${item.id}`}
                  body={{ status: "CONCLUIDA" }}
                  label="Concluir"
                />
              ))}
            {item.deletedAt
              ? user?.permissions.includes("task.restore") && (
                  <SoftDeleteAction
                    restore
                    endpoint={`/api/v1/tasks/${item.id}/restore`}
                  />
                )
              : user?.permissions.includes("task.delete") && (
                  <SoftDeleteAction endpoint={`/api/v1/tasks/${item.id}`} />
                )}
          </div>,
        ])}
      />
      <Pagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        searchParams={query}
      />
    </>
  );
}
