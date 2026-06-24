import Link from "next/link";
import { CreatePanel } from "@/components/create-panel";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { SearchForm } from "@/components/search-form";
import { StatusBadge } from "@/components/status-badge";
import { fetchData, type Lookups } from "@/lib/page-data";
import { Pagination } from "@/components/pagination";
import { ModuleNav } from "@/features/shared/components/module-nav";

interface ClientList {
  items: Array<{
    id: string;
    name: string;
    email?: string;
    phone?: string;
    taxIdLast4?: string;
    status: string;
    primaryBranch: { name: string };
    responsibleUser?: { name: string };
    _count: { attendances: number; caseParties: number };
  }>;
  total: number;
  page: number;
  pageSize: number;
}

export default async function ClientsPage({
  searchParams,
}: {
    searchParams: Promise<{ search?: string; page?: string; branchId?: string; status?: string }>;
}) {
  const query = await searchParams;
  const { search } = query;
  const [data, lookups] = await Promise.all([
    fetchData<ClientList>(
      `/v1/clients?${new URLSearchParams({ search: search ?? "", page: query.page ?? "1", branchId: query.branchId ?? "", status: query.status ?? "" })}`,
    ),
    fetchData<Lookups>("/v1/lookups"),
  ]);
  return (
    <>
      <PageHeader
        eyebrow={`${data.total} registros`}
        title="Clientes"
        description="Cadastro central de pessoas físicas e jurídicas, seus processos e documentos."
        action={
          <CreatePanel
            title="Novo cliente"
            endpoint="/api/v1/clients"
            buttonLabel="Novo cliente"
            fields={[
              {
                name: "name",
                label: "Nome completo / razão social",
                required: true,
              },
              {
                name: "type",
                label: "Tipo",
                type: "select",
                required: true,
                defaultValue: "INDIVIDUAL",
                options: [
                  { value: "INDIVIDUAL", label: "Pessoa física" },
                  { value: "COMPANY", label: "Pessoa jurídica" },
                ],
              },
              {
                name: "primaryBranchId",
                label: "Filial principal",
                type: "select",
                required: true,
                options: lookups.branches.map((item) => ({
                  value: item.id,
                  label: item.name,
                })),
              },
              {
                name: "responsibleUserId",
                label: "Responsável",
                type: "select",
                options: lookups.users.map((item) => ({
                  value: item.id,
                  label: item.name,
                })),
              },
              { name: "email", label: "E-mail", type: "email" },
              { name: "phone", label: "Telefone" },
              { name: "taxId", label: "CPF/CNPJ" },
              { name: "identity", label: "RG" },
              { name: "birthDate", label: "Data de nascimento", type: "date" },
              { name: "notes", label: "Observações", type: "textarea" },
            ]}
          />
        }
      />
      <ModuleNav items={[{ label: "Todos", href: "/clientes" }, { label: "Ativos", href: "/clientes?status=ACTIVE" }, { label: "Inativos", href: "/clientes?status=INACTIVE" }, { label: "Arquivados", href: "/clientes?status=ARCHIVED" }]} />
      <SearchForm defaultValue={search} placeholder="Nome, e-mail ou CPF/CNPJ">
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
          "Cliente",
          "Filial",
          "Contato",
          "Responsável",
          "Vínculos",
          "Status",
        ]}
        emptyMessage={Object.entries(query).some(([k, v]) => k !== "page" && v) ? "Nenhum cliente encontrado com os filtros aplicados." : "Nenhum cliente cadastrado ainda. Use “Novo cliente” para começar."}
        rows={data.items.map((item) => [
          <Link
            key={item.id}
            href={`/clientes/${item.id}`}
            className="font-medium text-cyan-600 hover:underline"
          >
            {item.name}
          </Link>,
          item.primaryBranch.name,
          <span key="contact">
            <span className="block">{item.email ?? "—"}</span>
            <span className="text-muted-foreground text-xs">
              {item.phone ??
                (item.taxIdLast4 ? `Documento •••• ${item.taxIdLast4}` : "")}
            </span>
          </span>,
          item.responsibleUser?.name ?? "—",
          `${item._count.attendances} atend. · ${item._count.caseParties} proc.`,
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
