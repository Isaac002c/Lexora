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
import { userSelectOptions } from "@/lib/user-options";

interface HearingList {
  items: Array<{
    id: string;
    branchId: string;
    clientId: string;
    caseId: string;
    legalAreaId?: string;
    attorneyId?: string;
    assistantId?: string;
    type: string;
    startsAt: string;
    hasTime: boolean;
    location?: string;
    meetingLink?: string;
    notes?: string;
    status: string;
    result?: string;
    deletedAt?: string;
    clientName: string;
    caseLabel: string;
    attorneyName?: string;
    assistantName?: string;
  }>;
  total: number;
  page: number;
  pageSize: number;
}
type Query = {
  search?: string;
  page?: string;
  status?: string;
  branchId?: string;
  responsibleId?: string;
  deleted?: "exclude" | "only";
};

export default async function HearingsPage({
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
    fetchData<HearingList>(`/v1/hearings?${params}`),
    fetchData<Lookups>("/v1/lookups"),
    getCurrentUser(),
  ]);
  const fields = [
    {
      name: "branchId",
      label: "Filial",
      type: "select" as const,
      required: true,
      options: lookups.branches.map((x) => ({ value: x.id, label: x.name })),
    },
    {
      name: "clientId",
      label: "Cliente",
      type: "select" as const,
      required: true,
      dependsOn: "branchId",
      options: lookups.clients.map((x) => ({
        value: x.id,
        label: x.name,
        parent: x.primaryBranchId,
      })),
    },
    {
      name: "caseId",
      label: "Processo",
      type: "select" as const,
      required: true,
      options: lookups.cases.map((x) => ({ value: x.id, label: x.name })),
    },
    { name: "type", label: "Tipo de audiência", required: true },
    {
      name: "startsAt",
      label: "Data e horário",
      type: "datetime-local" as const,
      required: true,
    },
    {
      name: "hasTime",
      label: "Horário definido",
      type: "checkbox" as const,
      defaultValue: true,
    },
    {
      name: "attorneyId",
      label: "Advogado",
      type: "select" as const,
      options: userSelectOptions(lookups.users, "ADVOGADO"),
    },
    {
      name: "assistantId",
      label: "Assistente",
      type: "select" as const,
      options: userSelectOptions(lookups.users),
    },
    { name: "location", label: "Local" },
    { name: "meetingLink", label: "Link" },
    { name: "notes", label: "Observações", type: "textarea" as const },
  ];
  return (
    <>
      <PageHeader
        eyebrow={`${data.total} audiências`}
        title="Audiências"
        description="Agenda processual, responsáveis, reagendamentos e resultados com alerta de cinco dias."
        action={
          user?.permissions.includes("hearing.create") && (
            <CreatePanel
              title="Nova audiência"
              endpoint="/api/v1/hearings"
              buttonLabel="Nova audiência"
              fields={fields}
            />
          )
        }
      />
      <ModuleNav
        items={[
          { label: "Próximas", href: "/audiencias" },
          { label: "Concluídas", href: "/audiencias?status=CONCLUIDA" },
          { label: "Canceladas", href: "/audiencias?status=CANCELADA" },
          ...(user?.permissions.includes("hearing.restore")
            ? [{ label: "Excluídas", href: "/audiencias?deleted=only" }]
            : []),
        ]}
      />
      <SearchForm defaultValue={query.search} placeholder="Tipo ou local">
        <select
          name="branchId"
          defaultValue={query.branchId}
          className="bg-background h-10 rounded-md border px-3 text-sm"
        >
          <option value="">Todas as filiais</option>
          {lookups.branches.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </SearchForm>
      <DataTable
        columns={[
          "Audiência",
          "Cliente / processo",
          "Data",
          "Responsáveis",
          "Local",
          "Status",
          "Ações",
        ]}
        rows={data.items.map((item) => [
          <span key={item.id} className="font-medium">
            {item.type}
          </span>,
          <span key="case">
            <span className="block">{item.clientName}</span>
            <span className="text-muted-foreground text-xs">
              {item.caseLabel}
            </span>
          </span>,
          formatDate(item.startsAt),
          [item.attorneyName, item.assistantName].filter(Boolean).join(" · ") ||
            "—",
          item.location ?? "—",
          <StatusBadge key="status" value={item.status} />,
          <div key="actions" className="flex flex-wrap gap-2">
            {!item.deletedAt &&
              user?.permissions.includes("hearing.update") && (
                <>
                  <CreatePanel
                    title={`Editar ${item.type}`}
                    endpoint={`/api/v1/hearings/${item.id}`}
                    method="PATCH"
                    buttonLabel="Editar"
                    fields={fields.map((field) => ({
                      ...field,
                      defaultValue:
                        (
                          {
                            branchId: item.branchId,
                            clientId: item.clientId,
                            caseId: item.caseId,
                            type: item.type,
                            startsAt: item.startsAt.slice(0, 16),
                            hasTime: item.hasTime,
                            attorneyId: item.attorneyId,
                            assistantId: item.assistantId,
                            location: item.location,
                            meetingLink: item.meetingLink,
                            notes: item.notes,
                          } as Record<string, string | boolean | undefined>
                        )[field.name] ?? field.defaultValue,
                    }))}
                  />
                  {item.status === "CONCLUIDA" ? (
                    <ApiActionButton
                      method="PATCH"
                      endpoint={`/api/v1/hearings/${item.id}`}
                      body={{ status: "AGENDADA" }}
                      label="Reabrir"
                    />
                  ) : (
                    <ApiActionButton
                      method="PATCH"
                      endpoint={`/api/v1/hearings/${item.id}`}
                      body={{ status: "CONCLUIDA" }}
                      label="Concluir"
                    />
                  )}
                </>
              )}
            {item.deletedAt
              ? user?.permissions.includes("hearing.restore") && (
                  <SoftDeleteAction
                    restore
                    endpoint={`/api/v1/hearings/${item.id}/restore`}
                  />
                )
              : user?.permissions.includes("hearing.delete") && (
                  <SoftDeleteAction endpoint={`/api/v1/hearings/${item.id}`} />
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
