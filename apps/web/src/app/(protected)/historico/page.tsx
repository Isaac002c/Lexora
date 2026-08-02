import { Download } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { SearchForm } from "@/components/search-form";
import { Button } from "@/components/ui/button";
import { HistoryDetails, type HistoryRecord } from "@/features/historico/components/history-details";
import { formatDate } from "@/lib/format";
import { fetchData, type Lookups } from "@/lib/page-data";
import { getCurrentUser } from "@/lib/server-api";
import { userOptionLabel } from "@/lib/user-options";

interface HistoryList {
  items: HistoryRecord[];
  total: number;
  page: number;
  pageSize: number;
  facets: { actions: string[]; modules: string[]; entityTypes: string[] };
}

export default async function HistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  const params = new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string] => Boolean(entry[1])));
  const [data, lookups, user] = await Promise.all([
    fetchData<HistoryList>(`/v1/audit?${params.toString()}`),
    fetchData<Lookups>("/v1/lookups"),
    getCurrentUser(),
  ]);
  const exportParams = new URLSearchParams(params);
  exportParams.delete("page");
  return <>
    <PageHeader eyebrow="Rastreabilidade" title="Histórico" description="Trilha imutável e somente leitura das ações realizadas neste ambiente." action={user?.permissions.includes("audit.export") && <Button asChild variant="outline"><a href={`/api/v1/audit/export.csv?${exportParams.toString()}`}><Download className="mr-2 h-4 w-4" />Exportar CSV</a></Button>} />
    <SearchForm defaultValue={query.search} placeholder="Buscar por usuário, ação ou descrição...">
      <input type="date" name="from" defaultValue={query.from} aria-label="Data inicial" className="h-10 rounded-md border bg-background px-3 text-sm" />
      <input type="date" name="to" defaultValue={query.to} aria-label="Data final" className="h-10 rounded-md border bg-background px-3 text-sm" />
      <select name="actorUserId" defaultValue={query.actorUserId} aria-label="Usuário" className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Todos os usuários</option>{lookups.users.map((item) => <option key={item.id} value={item.id}>{userOptionLabel(item)}</option>)}</select>
      <select name="module" defaultValue={query.module} aria-label="Módulo" className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Todos os módulos</option>{data.facets.modules.map((item) => <option key={item} value={item}>{item}</option>)}</select>
      <select name="action" defaultValue={query.action} aria-label="Ação" className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Todas as ações</option>{data.facets.actions.map((item) => <option key={item} value={item}>{item}</option>)}</select>
      <select name="entityType" defaultValue={query.entityType} aria-label="Entidade" className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Todas as entidades</option>{data.facets.entityTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select>
    </SearchForm>
    <DataTable columns={["Data", "Usuário", "Módulo", "Ação", "Descrição", ""]} rows={data.items.map((item) => [formatDate(item.createdAt, true), item.actorName ?? "Sistema", item.module ?? item.entityType, item.action, item.description, <HistoryDetails key={item.id} record={item} />])} />
    <Pagination page={data.page} pageSize={data.pageSize} total={data.total} searchParams={query} />
  </>;
}
