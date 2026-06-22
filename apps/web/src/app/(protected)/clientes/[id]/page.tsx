import Link from "next/link";
import { notFound } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { CreatePanel } from "@/components/create-panel";
import { ApiActionButton } from "@/components/api-action-button";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney } from "@/lib/format";
import { apiFetch, getCurrentUser } from "@/lib/server-api";
import { fetchData, type Lookups } from "@/lib/page-data";
import { Timeline, type TimelineItem } from "@/features/historico/components/timeline";

interface ClientDetail {
  id: string;
  type: "INDIVIDUAL" | "COMPANY";
  name: string;
  email?: string;
  phone?: string;
  taxIdLast4?: string;
  birthDate?: string;
  notes?: string;
  status: string;
  primaryBranch: { id: string; name: string };
  responsibleUser?: { id: string; name: string };
  attendances: Array<{ id: string; occurredAt: string; status: string }>;
  caseParties: Array<{
    case: {
      id: string;
      caseType: string;
      processNumber?: string;
      status: string;
      legalArea: { name: string };
    };
  }>;
  documents: Array<{
    id: string;
    name: string;
    status: string;
    createdAt: string;
  }>;
  feeContracts: Array<{ id: string; feeAmount: string; status: string }>;
}
export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const response = await apiFetch(`/v1/clients/${id}`);
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error("Não foi possível carregar o cliente.");
  const item = (await response.json()) as ClientDetail;
  const [lookups, user, history] = await Promise.all([fetchData<Lookups>("/v1/lookups"), getCurrentUser(), fetchData<{ items: TimelineItem[] }>(`/v1/audit/entity/CLIENT/${id}`)]);
  const canUpdate = user?.permissions.includes("client.update");
  return (
    <>
      <PageHeader
        eyebrow={item.primaryBranch.name}
        title={item.name}
        description={`${item.email ?? "Sem e-mail"} · ${item.phone ?? "Sem telefone"}`}
        action={<div className="flex flex-wrap gap-2"><StatusBadge value={item.status} />{canUpdate && <><CreatePanel title={`Editar ${item.name}`} endpoint={`/api/v1/clients/${item.id}`} method="PATCH" buttonLabel="Editar cliente" fields={[{ name: "name", label: "Nome completo / razão social", required: true, defaultValue: item.name }, { name: "type", label: "Tipo", type: "select", required: true, defaultValue: item.type, options: [{ value: "INDIVIDUAL", label: "Pessoa física" }, { value: "COMPANY", label: "Pessoa jurídica" }] }, { name: "primaryBranchId", label: "Filial principal", type: "select", required: true, defaultValue: item.primaryBranch.id, options: lookups.branches.map((branch) => ({ value: branch.id, label: branch.name })) }, { name: "responsibleUserId", label: "Responsável interno", type: "select", defaultValue: item.responsibleUser?.id, options: lookups.users.map((responsible) => ({ value: responsible.id, label: responsible.name })) }, { name: "email", label: "E-mail", type: "email", defaultValue: item.email }, { name: "phone", label: "Telefone", defaultValue: item.phone }, { name: "birthDate", label: "Nascimento", type: "date", defaultValue: item.birthDate?.slice(0, 10) }, { name: "notes", label: "Observações", type: "textarea", defaultValue: item.notes }, { name: "status", label: "Status", type: "select", required: true, defaultValue: item.status, options: [{ value: "ACTIVE", label: "Ativo" }, { value: "INACTIVE", label: "Inativo" }, { value: "ARCHIVED", label: "Arquivado" }] }]} />{item.status !== "ARCHIVED" && <ApiActionButton method="PATCH" endpoint={`/api/v1/clients/${item.id}`} body={{ status: "ARCHIVED" }} label="Arquivar" confirmMessage="Arquivar este cliente?" variant="ghost" />}</>}</div>}
      />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Documento</CardTitle>
          </CardHeader>
          <CardContent>
            {item.taxIdLast4 ? `•••• ${item.taxIdLast4}` : "Não informado"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Responsável interno</CardTitle>
          </CardHeader>
          <CardContent>
            {item.responsibleUser?.name ?? "Não atribuído"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Nascimento</CardTitle>
          </CardHeader>
          <CardContent>{formatDate(item.birthDate)}</CardContent>
        </Card>
      </div>
      <h2 className="mb-3 text-lg font-semibold">Processos</h2>
      <DataTable
        columns={["Processo", "Área", "Status"]}
        rows={item.caseParties.map(({ case: legalCase }) => [
          <Link
            key={legalCase.id}
            href={`/processos/${legalCase.id}`}
            className="text-cyan-600 hover:underline"
          >
            {legalCase.processNumber ?? legalCase.caseType}
          </Link>,
          legalCase.legalArea.name,
          <StatusBadge key="status" value={legalCase.status} />,
        ])}
      />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-semibold">Atendimentos</h2>
          <DataTable
            columns={["Data", "Status"]}
            rows={item.attendances.map((x) => [
              formatDate(x.occurredAt, true),
              <StatusBadge key={x.id} value={x.status} />,
            ])}
          />
        </div>
        <div>
          <h2 className="mb-3 text-lg font-semibold">Contratos</h2>
          <DataTable
            columns={["Valor", "Status"]}
            rows={item.feeContracts.map((x) => [
              formatMoney(x.feeAmount),
              <StatusBadge key={x.id} value={x.status} />,
            ])}
          />
        </div>
      </div>
      <section className="mt-8"><h2 className="mb-4 text-lg font-semibold">Histórico</h2><Timeline items={history.items} /></section>
    </>
  );
}
