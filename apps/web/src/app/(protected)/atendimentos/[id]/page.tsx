import Link from "next/link";
import { notFound } from "next/navigation";
import { CreatePanel } from "@/components/create-panel";
import { AttendanceConvertPanel } from "@/components/attendance-convert-panel";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDay } from "@/lib/format";
import { fetchData, type Lookups } from "@/lib/page-data";
import { apiFetch, getCurrentUser } from "@/lib/server-api";
import { Timeline, type TimelineItem } from "@/features/historico/components/timeline";
import { ATTENDANCE_ORIGINS } from "@chronostek/contracts";

interface AttendanceDetail {
  id: string;
  clientName: string;
  phone?: string;
  email?: string;
  occurredAt: string;
  origin?: string;
  notes?: string;
  status: string;
  branch: { id: string; name: string };
  legalArea?: { id: string; name: string };
  attorney?: { id: string; name: string };
  client?: { id: string; name: string };
  convertedCase?: { id: string; processNumber?: string; caseType: string };
}

export default async function AttendanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const response = await apiFetch(`/v1/attendances/${id}`);
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error("Não foi possível carregar o atendimento.");
  const item = (await response.json()) as AttendanceDetail;
  const [lookups, user, history] = await Promise.all([
    fetchData<Lookups>("/v1/lookups"),
    getCurrentUser(),
    fetchData<{ items: TimelineItem[] }>(`/v1/audit/entity/ATTENDANCE/${id}`),
  ]);
  const canUpdate = user?.permissions.includes("attendance.update");
  const canConvert = user?.permissions.includes("attendance.convert");
  return (
    <>
      <PageHeader
        eyebrow={`${item.branch.name} · ${formatDay(item.occurredAt)}`}
        title={item.clientName}
        description="Detalhes da triagem, direcionamento e conversão."
        action={
          <div className="flex flex-wrap gap-2">
            <StatusBadge value={item.status} />
            {canUpdate && (
              <CreatePanel
                title="Editar atendimento"
                endpoint={`/api/v1/attendances/${id}`}
                method="PATCH"
                buttonLabel="Editar atendimento"
                fields={[
                  {
                    name: "clientName",
                    label: "Nome do cliente",
                    required: true,
                    defaultValue: item.clientName,
                  },
                  {
                    name: "occurredAt",
                    label: "Data",
                    type: "date",
                    required: true,
                    defaultValue: item.occurredAt.slice(0, 10),
                  },
                  {
                    name: "branchId",
                    label: "Filial",
                    type: "select",
                    required: true,
                    defaultValue: item.branch.id,
                    options: lookups.branches.map((branch) => ({
                      value: branch.id,
                      label: branch.name,
                    })),
                  },
                  {
                    name: "legalAreaId",
                    label: "Área jurídica",
                    type: "select",
                    defaultValue: item.legalArea?.id,
                    options: lookups.legalAreas.map((area) => ({
                      value: area.id,
                      label: area.name,
                    })),
                  },
                  {
                    name: "attorneyId",
                    label: "Advogado",
                    type: "select",
                    defaultValue: item.attorney?.id,
                    options: lookups.users.map((attorney) => ({
                      value: attorney.id,
                      label: attorney.name,
                    })),
                  },
                  {
                    name: "phone",
                    label: "Telefone",
                    defaultValue: item.phone,
                  },
                  {
                    name: "email",
                    label: "E-mail",
                    type: "email",
                    defaultValue: item.email,
                  },
                  {
                    name: "origin",
                    label: "Origem",
                    type: "select",
                    defaultValue: item.origin,
                    options: ATTENDANCE_ORIGINS.map((o) => ({ value: o, label: o })),
                  },
                  {
                    name: "status",
                    label: "Status",
                    type: "select",
                    required: true,
                    defaultValue: item.status,
                    options: [
                      "NOVO",
                      "EM_TRIAGEM",
                      "AGUARDANDO_DOCUMENTOS",
                      "DIRECIONADO",
                      "CONVERTIDO_EM_PROCESSO",
                      "ENCERRADO",
                    ].map((status) => ({
                      value: status,
                      label: status.replaceAll("_", " "),
                    })),
                  },
                  {
                    name: "notes",
                    label: "Observações",
                    type: "textarea",
                    defaultValue: item.notes,
                  },
                ]}
              />
            )}
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Contato</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>{item.phone ?? "Sem telefone"}</p>
            <p>{item.email ?? "Sem e-mail"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Direcionamento</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>{item.legalArea?.name ?? "Área não definida"}</p>
            <p>{item.attorney?.name ?? "Advogado não definido"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Vínculos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {item.client ? (
              <Link
                className="block text-cyan-600"
                href={`/clientes/${item.client.id}`}
              >
                Cliente: {item.client.name}
              </Link>
            ) : (
              <p>Cliente ainda não gerado</p>
            )}
            {item.convertedCase ? (
              <Link
                className="block text-cyan-600"
                href={`/processos/${item.convertedCase.id}`}
              >
                Processo:{" "}
                {item.convertedCase.processNumber ??
                  item.convertedCase.caseType}
              </Link>
            ) : (
              <p>Processo ainda não gerado</p>
            )}
            {!item.convertedCase && canConvert && (
              <div className="pt-2">
                <AttendanceConvertPanel
                  id={id}
                  branchId={item.branch.id}
                  legalAreaId={item.legalArea?.id}
                  lookups={lookups}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Observações</CardTitle>
        </CardHeader>
        <CardContent className="whitespace-pre-wrap text-sm">
          {item.notes ?? "Nenhuma observação registrada."}
        </CardContent>
      </Card>
      <section className="mt-8"><h2 className="mb-4 text-lg font-semibold">Histórico</h2><Timeline items={history.items} /></section>
    </>
  );
}
