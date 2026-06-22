import { CreatePanel } from "@/components/create-panel";
import Link from "next/link";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { SearchForm } from "@/components/search-form";
import { StatusBadge } from "@/components/status-badge";
import { AttendanceConvertPanel } from "@/components/attendance-convert-panel";
import { Pagination } from "@/components/pagination";
import { formatDate } from "@/lib/format";
import { fetchData, type Lookups } from "@/lib/page-data";
import { ModuleNav } from "@/features/shared/components/module-nav";

interface AttendanceList {
  items: Array<{
    id: string;
    branchId: string;
    legalAreaId?: string;
    clientName: string;
    occurredAt: string;
    origin?: string;
    status: string;
    branch: { name: string };
    legalArea?: { name: string };
    attorney?: { name: string };
  }>;
  total: number;
  page: number;
  pageSize: number;
}
export default async function AttendancesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; status?: string }>;
}) {
  const query = await searchParams;
  const { search } = query;
  const [data, lookups] = await Promise.all([
    fetchData<AttendanceList>(
      `/v1/attendances?${new URLSearchParams({ search: search ?? "", page: query.page ?? "1", status: query.status ?? "" })}`,
    ),
    fetchData<Lookups>("/v1/lookups"),
  ]);
  return (
    <>
      <PageHeader
        eyebrow={`${data.total} atendimentos`}
        title="Atendimentos"
        description="Triagem da secretaria e porta de entrada para novos clientes e processos."
        action={
          <CreatePanel
            title="Novo atendimento"
            endpoint="/api/v1/attendances"
            buttonLabel="Novo atendimento"
            fields={[
              { name: "clientName", label: "Nome do cliente", required: true },
              {
                name: "occurredAt",
                label: "Data e hora",
                type: "datetime-local",
                required: true,
              },
              {
                name: "branchId",
                label: "Filial",
                type: "select",
                required: true,
                options: lookups.branches.map((x) => ({
                  value: x.id,
                  label: x.name,
                })),
              },
              {
                name: "legalAreaId",
                label: "Área jurídica",
                type: "select",
                options: lookups.legalAreas.map((x) => ({
                  value: x.id,
                  label: x.name,
                })),
              },
              {
                name: "attorneyId",
                label: "Advogado",
                type: "select",
                options: lookups.users.map((x) => ({
                  value: x.id,
                  label: x.name,
                })),
              },
              { name: "phone", label: "Telefone" },
              { name: "email", label: "E-mail", type: "email" },
              { name: "origin", label: "Origem" },
              { name: "notes", label: "Observações", type: "textarea" },
            ]}
          />
        }
      />
      <ModuleNav
        items={[
          { label: "Todos", href: "/atendimentos" },
          { label: "Novos", href: "/atendimentos?status=NOVO" },
          { label: "Em triagem", href: "/atendimentos?status=EM_TRIAGEM" },
          { label: "Aguardando documentos", href: "/atendimentos?status=AGUARDANDO_DOCUMENTOS" },
          { label: "Direcionados", href: "/atendimentos?status=DIRECIONADO" },
          { label: "Convertidos", href: "/atendimentos?status=CONVERTIDO_EM_PROCESSO" },
          { label: "Encerrados", href: "/atendimentos?status=ENCERRADO" },
        ]}
      />
      <SearchForm defaultValue={search} placeholder="Nome ou e-mail" />
      <DataTable
        columns={[
          "Cliente",
          "Data",
          "Filial",
          "Área",
          "Advogado",
          "Origem",
          "Status",
          "Ação",
        ]}
        rows={data.items.map((item) => [
          <Link key={item.id} href={`/atendimentos/${item.id}`} className="font-medium text-cyan-600 hover:underline">{item.clientName}</Link>,
          formatDate(item.occurredAt, true),
          item.branch.name,
          item.legalArea?.name ?? "—",
          item.attorney?.name ?? "—",
          item.origin ?? "—",
          <StatusBadge key="status" value={item.status} />,
          item.status === "CONVERTIDO_EM_PROCESSO" ? (
            "Convertido"
          ) : (
            <AttendanceConvertPanel
              key="convert"
              id={item.id}
              branchId={item.branchId}
              legalAreaId={item.legalAreaId}
              lookups={lookups}
            />
          ),
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
