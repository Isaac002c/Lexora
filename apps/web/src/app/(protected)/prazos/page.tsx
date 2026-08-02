import Link from "next/link";
import { ApiActionButton } from "@/components/api-action-button";
import { CreatePanel } from "@/components/create-panel";
import { DataTable } from "@/components/data-table";
import { DeadlineCalendar } from "@/components/deadline-calendar";
import { PageHeader } from "@/components/page-header";
import { SearchForm } from "@/components/search-form";
import { StatusBadge } from "@/components/status-badge";
import { ModuleNav } from "@/features/shared/components/module-nav";
import { formatDay } from "@/lib/format";
import { fetchData, type Lookups } from "@/lib/page-data";
import { deadlineTypeLabel } from "@/lib/deadline-labels";
import {
  deadlineInternalState,
  internalDueAt,
  INTERNAL_STATE_LABELS,
} from "@chronostek/contracts";
import { SoftDeleteAction } from "@/components/soft-delete-action";
import { userOptionLabel, userSelectOptions } from "@/lib/user-options";
import { getCurrentUser } from "@/lib/server-api";

interface DeadlineList {
  items: Array<{
    id: string;
    branchId: string;
    caseId: string;
    clientId: string;
    legalAreaId: string;
    responsibleUserId: string;
    title: string;
    type: string;
    dueAt: string;
    priority: string;
    status: string;
    completedAt?: string;
    deletedAt?: string;
    color: string;
    notes?: string;
    branch: { name: string };
    client: { name: string };
    case: { processNumber?: string; caseType: string };
    responsibleUser: { name: string };
  }>;
  total: number;
}
type Query = {
  search?: string;
  view?: "overdue" | "today" | "next5" | "next7" | "distant" | "completed";
  branchId?: string;
  legalAreaId?: string;
  responsibleId?: string;
  status?: string;
  type?: string;
  deleted?: "exclude" | "only";
};
const types = [
  "PETICAO_INICIAL",
  "AUDIENCIA",
  "RECURSO",
  "MANIFESTACAO",
  "ADMINISTRATIVO",
  "OUTRO",
];
export default async function DeadlinesPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const query = await searchParams;
  const params = new URLSearchParams({
    pageSize: "100",
    ...Object.fromEntries(
      Object.entries(query).filter((entry): entry is [string, string] =>
        Boolean(entry[1]),
      ),
    ),
  });
  const [data, lookups, user] = await Promise.all([
    fetchData<DeadlineList>(`/v1/deadlines?${params}`),
    fetchData<Lookups>("/v1/lookups"),
    getCurrentUser(),
  ]);
  const canManage = Boolean(user?.permissions.includes("deadline.manage"));
  const canApprove = Boolean(user?.permissions.includes("deadline.approve"));
  const deadlineFields = [
    { name: "title", label: "Título", required: true },
    {
      name: "type",
      label: "Tipo",
      type: "select" as const,
      required: true,
      options: types.map((value) => ({
        value,
        label: deadlineTypeLabel(value),
      })),
    },
    {
      name: "caseId",
      label: "Processo",
      type: "select" as const,
      required: true,
      options: lookups.cases.map((item) => ({
        value: item.id,
        label: item.name,
      })),
    },
    {
      name: "clientId",
      label: "Cliente",
      type: "select" as const,
      required: true,
      options: lookups.clients.map((item) => ({
        value: item.id,
        label: item.name,
      })),
    },
    {
      name: "branchId",
      label: "Filial",
      type: "select" as const,
      required: true,
      options: lookups.branches.map((item) => ({
        value: item.id,
        label: item.name,
      })),
    },
    {
      name: "legalAreaId",
      label: "Área",
      type: "select" as const,
      required: true,
      options: lookups.legalAreas.map((item) => ({
        value: item.id,
        label: item.name,
      })),
    },
    {
      name: "responsibleUserId",
      label: "Responsável",
      type: "select" as const,
      required: true,
      options: userSelectOptions(lookups.users),
    },
    {
      name: "dueAt",
      label: "Vencimento",
      type: "date" as const,
      required: true,
    },
    {
      name: "priority",
      label: "Prioridade",
      type: "select" as const,
      defaultValue: "NORMAL",
      options: ["LOW", "NORMAL", "HIGH", "URGENT"].map((value) => ({
        value,
        label: value,
      })),
    },
    { name: "notes", label: "Observações", type: "textarea" as const },
  ];
  return (
    <>
      <PageHeader
        eyebrow={`${data.total} prazos`}
        title="Prazos"
        description="Controle operacional de vencimentos com revisão gerencial antes da conclusão."
        action={
          canManage ? <CreatePanel
            title="Novo prazo"
            endpoint="/api/v1/deadlines"
            buttonLabel="Novo prazo"
            fields={deadlineFields}
          /> : undefined
        }
      />
      <ModuleNav
        items={[
          { label: "Todos", href: "/prazos" },
          { label: "Vencidos", href: "/prazos?view=overdue" },
          { label: "Vencem hoje", href: "/prazos?view=today" },
          { label: "Próximos 5 dias", href: "/prazos?view=next5" },
          { label: "Próximos 7 dias", href: "/prazos?view=next7" },
          { label: "Mais distantes", href: "/prazos?view=distant" },
          { label: "Aguardando aprovação", href: "/prazos?status=PENDING_APPROVAL" },
          { label: "Concluídos", href: "/prazos?view=completed" },
          ...(user?.permissions.includes("deadline.restore")
            ? [{ label: "Excluídos", href: "/prazos?deleted=only" }]
            : []),
        ]}
      />
      <SearchForm defaultValue={query.search} placeholder="Título do prazo">
        <select
          name="branchId"
          defaultValue={query.branchId}
          className="bg-background h-10 rounded-md border px-3 text-sm"
        >
          <option value="">Todas as filiais</option>
          {lookups.branches.map((item) => (
            <option key={item.id} value={item.id}>
              {userOptionLabel(item)}
            </option>
          ))}
        </select>
        <select
          name="legalAreaId"
          defaultValue={query.legalAreaId}
          className="bg-background h-10 rounded-md border px-3 text-sm"
        >
          <option value="">Todas as áreas</option>
          {lookups.legalAreas.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          name="responsibleId"
          defaultValue={query.responsibleId}
          className="bg-background h-10 rounded-md border px-3 text-sm"
        >
          <option value="">Todos os responsáveis</option>
          {lookups.users.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          name="type"
          defaultValue={query.type}
          className="bg-background h-10 rounded-md border px-3 text-sm"
        >
          <option value="">Todos os tipos</option>
          {types.map((value) => (
            <option key={value} value={value}>
              {deadlineTypeLabel(value)}
            </option>
          ))}
        </select>
      </SearchForm>
      <DeadlineCalendar items={data.items} mode="list" />
      <DataTable
        columns={[
          "Prazo",
          "Cliente / processo",
          "Responsável",
          "Vencimento",
          "Prioridade",
          "Situação",
          "Ações",
        ]}
        rows={data.items.map((item) => [
          <span key={item.id}>
            <span className="block font-medium">{item.title}</span>
            <span
              className={`text-xs ${item.type === "AUDIENCIA" ? "font-semibold text-purple-600" : "text-muted-foreground"}`}
            >
              {deadlineTypeLabel(item.type)}
            </span>
          </span>,
          <span key="case">
            <span className="block">{item.client.name}</span>
            <Link
              href={`/processos/${item.caseId}`}
              className="text-xs text-cyan-600"
            >
              {item.case.processNumber ?? item.case.caseType}
            </Link>
          </span>,
          item.responsibleUser.name,
          <span key="due">
            <span className="block">{formatDay(item.dueAt)}</span>
            <span className="text-muted-foreground text-xs">
              interno: {formatDay(internalDueAt(item.dueAt))}
            </span>
          </span>,
          item.priority,
          <span key="state" className="flex flex-col gap-1">
            <span className="flex flex-wrap gap-1">
              <StatusBadge value={item.status} />
              <StatusBadge value={item.color} />
            </span>
            <span className="text-muted-foreground text-xs">
              {
                INTERNAL_STATE_LABELS[
                  deadlineInternalState(
                    item.dueAt,
                    item.status,
                    new Date(),
                    item.completedAt,
                  )
                ]
              }
            </span>
          </span>,
          <div key="actions" className="flex flex-wrap gap-2">
            {!item.deletedAt && canManage && item.status !== "PENDING_APPROVAL" && (
              <CreatePanel
                title={`Editar ${item.title}`}
                endpoint={`/api/v1/deadlines/${item.id}`}
                method="PATCH"
                buttonLabel="Editar"
                fields={deadlineFields.map((field) => ({
                  ...field,
                  defaultValue:
                    (
                      {
                        title: item.title,
                        type: item.type,
                        caseId: item.caseId,
                        clientId: item.clientId,
                        branchId: item.branchId,
                        legalAreaId: item.legalAreaId,
                        responsibleUserId: item.responsibleUserId,
                        dueAt: item.dueAt.slice(0, 10),
                        priority: item.priority,
                        notes: item.notes,
                      } as Record<string, string | undefined>
                    )[field.name] ?? field.defaultValue,
                }))}
              />
            )}
            {!item.deletedAt && item.status === "COMPLETED" && canApprove && (
                <ApiActionButton
                  method="PATCH"
                  endpoint={`/api/v1/deadlines/${item.id}/status`}
                  body={{ status: "PENDING" }}
                  label="Reabrir"
                  confirmMessage="Reabrir este prazo concluído?"
                />
            )}
            {!item.deletedAt &&
              canManage &&
              ["PENDING", "IN_PROGRESS"].includes(item.status) && (
                <ApiActionButton
                  endpoint={`/api/v1/deadlines/${item.id}/submit-approval`}
                  body={{}}
                  label="Enviar para aprovação"
                  confirmMessage="Enviar a conclusão deste prazo para aprovação dos superiores?"
                />
              )}
            {!item.deletedAt && item.status === "PENDING_APPROVAL" && canApprove && (
              <>
                <ApiActionButton
                  endpoint={`/api/v1/deadlines/${item.id}/review`}
                  body={{ action: "APPROVE" }}
                  label="Aprovar conclusão"
                  confirmMessage="Aprovar e concluir definitivamente este prazo?"
                  variant="default"
                />
                <CreatePanel
                  title={`Devolver ${item.title}`}
                  endpoint={`/api/v1/deadlines/${item.id}/review`}
                  buttonLabel="Devolver para ajuste"
                  fixedBody={{ action: "RETURN" }}
                  fields={[
                    {
                      name: "notes",
                      label: "Motivo da devolução",
                      type: "textarea",
                      required: true,
                    },
                  ]}
                />
              </>
            )}
            {item.deletedAt
              ? user?.permissions.includes("deadline.restore") && (
                  <SoftDeleteAction
                    restore
                    endpoint={`/api/v1/deadlines/${item.id}/restore`}
                  />
                )
              : user?.permissions.includes("deadline.delete") && (
                  <SoftDeleteAction endpoint={`/api/v1/deadlines/${item.id}`} />
                )}
          </div>,
        ])}
      />
    </>
  );
}
