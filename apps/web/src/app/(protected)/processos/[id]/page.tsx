import { notFound } from "next/navigation";
import { CreatePanel } from "@/components/create-panel";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { apiFetch, getCurrentUser } from "@/lib/server-api";
import { fetchData, type Lookups } from "@/lib/page-data";
import { Timeline, type TimelineItem } from "@/features/historico/components/timeline";

interface CaseDetail {
  id: string;
  caseType: string;
  processNumber?: string;
  status: string;
  entryDate: string;
  distributionDate?: string;
  initialPetitionDueAt?: string;
  hearingAt?: string;
  appealDueAt?: string;
  lastProgress?: string;
  lastProgressAt?: string;
  notes?: string;
  branch: { name: string };
  legalArea: { name: string };
  parties: Array<{ client: { name: string } }>;
  assignments: Array<{ type: string; user: { id: string; name: string } }>;
  deadlines: Array<{
    id: string;
    title: string;
    dueAt: string;
    status: string;
  }>;
  documents: Array<{ id: string; name: string; status: string }>;
  checklists: Array<{
    id: string;
    name: string;
    items: Array<{ status: string }>;
  }>;
}
export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const response = await apiFetch(`/v1/cases/${id}`);
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error("Não foi possível carregar o processo.");
  const item = (await response.json()) as CaseDetail;
  const [lookups, user, history] = await Promise.all([fetchData<Lookups>("/v1/lookups"), getCurrentUser(), fetchData<{ items: TimelineItem[] }>(`/v1/audit/entity/LEGAL_CASE/${id}`)]);
  const canUpdate = user?.permissions.some((permission) => permission === "case.update" || permission === "case.update_assigned");
  const canReassign = user?.permissions.includes("case.update");
  return (
    <>
      <PageHeader
        eyebrow={`${item.legalArea.name} · ${item.branch.name}`}
        title={item.processNumber ?? item.caseType}
        description={item.parties.map((x) => x.client.name).join(", ")}
        action={canUpdate ?
          <CreatePanel
            title="Atualizar processo"
            endpoint={`/api/v1/cases/${id}`}
            method="PATCH"
            buttonLabel="Atualizar processo"
            fields={[
              {
                name: "processNumber",
                label: "Número do processo",
                defaultValue: item.processNumber,
              },
              {
                name: "distributionDate",
                label: "Data de distribuição",
                type: "date",
                defaultValue: item.distributionDate?.slice(0, 10),
              },
              { name: "initialPetitionDueAt", label: "Prazo da petição inicial", type: "datetime-local", defaultValue: item.initialPetitionDueAt?.slice(0, 16) },
              { name: "hearingAt", label: "Data da audiência", type: "datetime-local", defaultValue: item.hearingAt?.slice(0, 16) },
              { name: "appealDueAt", label: "Prazo de recurso", type: "datetime-local", defaultValue: item.appealDueAt?.slice(0, 16) },
              ...(canReassign ? [
                { name: "responsibleUserId", label: "Responsável interno", type: "select" as const, defaultValue: item.assignments.find((assignment) => assignment.type === "INTERNAL_OWNER")?.user.id, options: lookups.users.map((responsible) => ({ value: responsible.id, label: responsible.name })) },
                { name: "attorneyId", label: "Advogado responsável", type: "select" as const, defaultValue: item.assignments.find((assignment) => assignment.type === "ATTORNEY")?.user.id, options: lookups.users.map((attorney) => ({ value: attorney.id, label: attorney.name })) },
              ] : []),
              {
                name: "status",
                label: "Status",
                type: "select",
                defaultValue: item.status,
                options: [
                  "EM_ANALISE",
                  "AGUARDANDO_DOCUMENTOS",
                  "AGUARDANDO_CONTRATO",
                  "AGUARDANDO_PAGAMENTO",
                  "PETICAO_INICIAL",
                  "PRONTO_PARA_DISTRIBUICAO",
                  "DISTRIBUIDO",
                  "EM_ANDAMENTO",
                  "FINALIZADO",
                  "ARQUIVADO",
                ].map((x) => ({ value: x, label: x.replaceAll("_", " ") })),
              },
              {
                name: "lastProgress",
                label: "Último andamento",
                type: "textarea",
                defaultValue: item.lastProgress,
              },
              {
                name: "notes",
                label: "Observações",
                type: "textarea",
                defaultValue: item.notes,
              },
            ]}
          />
        : undefined}
      />
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge value={item.status} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Entrada</CardTitle>
          </CardHeader>
          <CardContent>{formatDate(item.entryDate)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Distribuição</CardTitle>
          </CardHeader>
          <CardContent>{formatDate(item.distributionDate)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Responsáveis</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {item.assignments.map((x) => x.user.name).join(", ") ||
              "Não atribuídos"}
          </CardContent>
        </Card>
      </div>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Último andamento</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{item.lastProgress ?? "Nenhum andamento registrado."}</p>
          <p className="text-muted-foreground mt-2 text-xs">
            {formatDate(item.lastProgressAt, true)}
          </p>
        </CardContent>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-semibold">Prazos</h2>
          <DataTable
            columns={["Título", "Vencimento", "Status"]}
            rows={item.deadlines.map((x) => [
              x.title,
              formatDate(x.dueAt, true),
              <StatusBadge key={x.id} value={x.status} />,
            ])}
          />
        </div>
        <div>
          <h2 className="mb-3 text-lg font-semibold">Documentos</h2>
          <DataTable
            columns={["Documento", "Status"]}
            rows={item.documents.map((x) => [
              x.name,
              <StatusBadge key={x.id} value={x.status} />,
            ])}
          />
        </div>
      </div>
      <section className="mt-8"><h2 className="mb-4 text-lg font-semibold">Histórico</h2><Timeline items={history.items} /></section>
    </>
  );
}
