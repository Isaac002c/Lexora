import { BarChart3, BriefcaseBusiness, CalendarClock, CircleDollarSign, Download, FileWarning, Scale, TrendingDown, Users } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { SearchForm } from "@/components/search-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleNav } from "@/features/shared/components/module-nav";
import { formatMoney } from "@/lib/format";
import { fetchData, type Lookups } from "@/lib/page-data";

interface ReportRow { name: string; count: number; amount?: string }
interface Report {
  attendedClients: number;
  closedContracts: number;
  revenue: string;
  delinquent: number;
  activeCases: number;
  finalizedCases: number;
  upcomingDeadlines: number;
  pendingDocuments: number;
  casesByArea: ReportRow[];
  casesByBranch: ReportRow[];
  casesByAttorney: ReportRow[];
  caseStatusBreakdown: ReportRow[];
  attendanceStatusBreakdown: ReportRow[];
  deadlineStatusBreakdown: ReportRow[];
  financeStatusBreakdown: ReportRow[];
}

type ReportQuery = { section?: string; from?: string; to?: string; branchId?: string; legalAreaId?: string; responsibleId?: string; status?: string };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<ReportQuery> }) {
  const query = await searchParams;
  const apiParams = new URLSearchParams();
  for (const key of ["from", "to", "branchId", "legalAreaId", "responsibleId", "status"] as const) {
    if (query[key]) apiParams.set(key, query[key]!);
  }
  const [data, lookups] = await Promise.all([
    fetchData<Report>(`/v1/reports/summary?${apiParams}`),
    fetchData<Lookups>("/v1/lookups"),
  ]);
  const section = query.section ?? "overview";
  const metrics = [
    ["Clientes atendidos", data.attendedClients, Users],
    ["Contratos fechados", data.closedContracts, Scale],
    ["Faturamento recebido", formatMoney(data.revenue), CircleDollarSign],
    ["Inadimplentes +15 dias", data.delinquent, TrendingDown],
    ["Processos ativos", data.activeCases, BriefcaseBusiness],
    ["Processos finalizados", data.finalizedCases, BarChart3],
    ["Prazos próximos", data.upcomingDeadlines, CalendarClock],
    ["Documentos pendentes", data.pendingDocuments, FileWarning],
  ] as const;
  const sectionTables: Record<string, { title: string; rows: ReportRow[]; money?: boolean }> = {
    clientes: { title: "Atendimentos por status", rows: data.attendanceStatusBreakdown },
    atendimentos: { title: "Atendimentos por status", rows: data.attendanceStatusBreakdown },
    processos: { title: "Processos por status", rows: data.caseStatusBreakdown },
    prazos: { title: "Prazos por status", rows: data.deadlineStatusBreakdown },
    financeiro: { title: "Parcelas por status", rows: data.financeStatusBreakdown, money: true },
    advogados: { title: "Processos por advogado", rows: data.casesByAttorney },
    filiais: { title: "Processos por filial", rows: data.casesByBranch },
  };
  const selected = sectionTables[section];

  return (
    <>
      <PageHeader
        eyebrow="Indicadores consolidados"
        title="Relatórios"
        description="Visão jurídica e financeira filtrada por período, filial, área e responsável."
        action={
          <a href={`/api/v1/reports/export.csv?${apiParams}`} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Download className="h-4 w-4" /> Exportar CSV
          </a>
        }
      />
      <ModuleNav items={[
        { label: "Visão geral", href: "/relatorios" },
        { label: "Clientes", href: "/relatorios?section=clientes" },
        { label: "Atendimentos", href: "/relatorios?section=atendimentos" },
        { label: "Processos", href: "/relatorios?section=processos" },
        { label: "Prazos", href: "/relatorios?section=prazos" },
        { label: "Financeiro", href: "/relatorios?section=financeiro" },
        { label: "Advogados", href: "/relatorios?section=advogados" },
        { label: "Filiais", href: "/relatorios?section=filiais" },
      ]} />
      <SearchForm placeholder="Filtro livre">
        {section !== "overview" && <input type="hidden" name="section" value={section} />}
        <input name="from" type="date" defaultValue={query.from} className="h-10 rounded-md border bg-background px-3 text-sm" aria-label="Data inicial" />
        <input name="to" type="date" defaultValue={query.to} className="h-10 rounded-md border bg-background px-3 text-sm" aria-label="Data final" />
        <select name="branchId" defaultValue={query.branchId} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Todas as filiais</option>{lookups.branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select name="legalAreaId" defaultValue={query.legalAreaId} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Todas as áreas</option>{lookups.legalAreas.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select name="responsibleId" defaultValue={query.responsibleId} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Todos os responsáveis</option>{lookups.users.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      </SearchForm>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value, Icon]) => <Card key={label}><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-muted-foreground text-sm">{label}</CardTitle><Icon className="h-4 w-4 text-cyan-500" /></CardHeader><CardContent className="text-2xl font-semibold">{value}</CardContent></Card>)}
      </div>
      {selected ? (
        <div className="mt-6">
          <DataTable
            columns={selected.money ? [selected.title, "Quantidade", "Valor"] : [selected.title, "Quantidade"]}
            rows={selected.rows.map((item) => selected.money ? [item.name.replaceAll("_", " "), item.count, formatMoney(item.amount ?? "0")] : [item.name.replaceAll("_", " "), item.count])}
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <DataTable columns={["Processos por área", "Quantidade"]} rows={data.casesByArea.map((item) => [item.name, item.count])} />
          <DataTable columns={["Processos por filial", "Quantidade"]} rows={data.casesByBranch.map((item) => [item.name, item.count])} />
          <DataTable columns={["Processos por advogado", "Quantidade"]} rows={data.casesByAttorney.map((item) => [item.name, item.count])} />
        </div>
      )}
    </>
  );
}
