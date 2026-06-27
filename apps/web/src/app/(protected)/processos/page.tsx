import Link from "next/link";
import { CreatePanel } from "@/components/create-panel";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { SearchForm } from "@/components/search-form";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";
import { fetchData, type Lookups } from "@/lib/page-data";
import { Pagination } from "@/components/pagination";
import { ModuleNav } from "@/features/shared/components/module-nav";

interface CaseList {
  items: Array<{
    id: string;
    caseType: string;
    processNumber?: string;
    status: string;
    entryDate: string;
    lastProgress?: string;
    branch: { name: string };
    legalArea: { name: string };
    parties: Array<{ client: { name: string } }>;
    assignments: Array<{ type: string; user: { name: string } }>;
  }>;
  total: number;
  page: number;
  pageSize: number;
}
export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    page?: string;
    branchId?: string;
    legalAreaId?: string;
    status?: string;
  }>;
}) {
  const query = await searchParams;
  const { search } = query;
  const [data, lookups] = await Promise.all([
    fetchData<CaseList>(
      `/v1/cases?${new URLSearchParams(Object.fromEntries(Object.entries(query).filter((x): x is [string, string] => Boolean(x[1]))))}`,
    ),
    fetchData<Lookups>("/v1/lookups"),
  ]);
  return (
    <>
      <PageHeader
        eyebrow={`${data.total} processos`}
        title="Processos"
        description="Distribuição, responsáveis e último andamento sempre visível."
        action={
          <CreatePanel
            title="Novo processo"
            endpoint="/api/v1/cases"
            buttonLabel="Novo processo"
            fields={[
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
                name: "clientId",
                label: "Cliente",
                type: "select",
                required: true,
                dependsOn: "branchId",
                dependsOnHint: "Selecione a filial primeiro",
                options: lookups.clients.map((x) => ({
                  value: x.id,
                  label: x.name,
                  parent: x.primaryBranchId,
                })),
              },
              { name: "caseType", label: "Tipo de processo", required: true },
              {
                name: "legalAreaId",
                label: "Área jurídica",
                type: "select",
                required: true,
                options: lookups.legalAreas.map((x) => ({
                  value: x.id,
                  label: x.name,
                })),
              },
              {
                name: "responsibleUserId",
                label: "Responsável interno",
                type: "select",
                options: lookups.users.map((x) => ({
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
              {
                name: "entryDate",
                label: "Data de entrada",
                type: "date",
                required: true,
              },
              { name: "notes", label: "Observações", type: "textarea" },
            ]}
          />
        }
      />
      <ModuleNav items={[{ label: "Todos", href: "/processos" }, { label: "Em análise", href: "/processos?status=EM_ANALISE" }, { label: "Aguardando documentos", href: "/processos?status=AGUARDANDO_DOCUMENTOS" }, { label: "Prontos para distribuição", href: "/processos?status=PRONTO_PARA_DISTRIBUICAO" }, { label: "Distribuídos", href: "/processos?status=DISTRIBUIDO" }, { label: "Em andamento", href: "/processos?status=EM_ANDAMENTO" }, { label: "Finalizados", href: "/processos?status=FINALIZADO" }, { label: "Arquivados", href: "/processos?status=ARQUIVADO" }]} />
      <SearchForm
        defaultValue={search}
        placeholder="Cliente, tipo ou número do processo"
      >
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
        <select
          name="legalAreaId"
          defaultValue={query.legalAreaId}
          className="bg-background h-10 rounded-md border px-3 text-sm"
        >
          <option value="">Todas as áreas</option>
          {lookups.legalAreas.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </SearchForm>
      <DataTable
        columns={[
          "Processo",
          "Cliente",
          "Área / filial",
          "Responsáveis",
          "Entrada",
          "Último andamento",
          "Status",
        ]}
        emptyMessage={Object.entries(query).some(([k, v]) => k !== "page" && v) ? "Nenhum processo encontrado com os filtros aplicados." : "Nenhum processo cadastrado ainda. Use “Novo processo” para começar."}
        rows={data.items.map((item) => [
          <Link
            key={item.id}
            href={`/processos/${item.id}`}
            className="font-medium text-cyan-600 hover:underline"
          >
            <span className="block">{item.processNumber ?? "Sem número"}</span>
            <span className="text-muted-foreground text-xs">
              {item.caseType}
            </span>
          </Link>,
          item.parties[0]?.client.name ?? "—",
          <span key="area">
            <span className="block">{item.legalArea.name}</span>
            <span className="text-muted-foreground text-xs">
              {item.branch.name}
            </span>
          </span>,
          item.assignments.map((a) => a.user.name).join(", ") || "—",
          formatDate(item.entryDate),
          <span key="progress" className="line-clamp-2">
            {item.lastProgress ?? "Nenhum andamento"}
          </span>,
          <StatusBadge key="status" value={item.status} />,
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
