import {
  BarChart3,
  Building2,
  CalendarClock,
  CircleDollarSign,
  ClipboardCheck,
  Gavel,
  TrendingDown,
  Users,
} from "lucide-react";
import { notFound } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { AreaDashboard } from "@/features/dashboard/components/area-dashboard";
import { formatMoney } from "@/lib/format";
import { fetchData, type Lookups } from "@/lib/page-data";
import { getCurrentUser } from "@/lib/server-api";
import { userOptionLabel } from "@/lib/user-options";

interface ReportRow {
  name: string;
  count: number;
}

interface Report {
  attendedClients: number;
  activeClients: number;
  companyClients: number;
  individualClients: number;
  revenue: string;
  delinquent: number;
  activeCases: number;
  finalizedCases: number;
  upcomingDeadlines: number;
  approvalPending: number;
  pendingDocuments: number;
  casesByArea: ReportRow[];
  casesByBranch: ReportRow[];
  casesByResponsible: ReportRow[];
}

type Query = {
  from?: string;
  to?: string;
  branchId?: string;
  legalAreaId?: string;
  responsibleId?: string;
};

export default async function ManagementDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const user = await getCurrentUser();
  if (!user?.permissions.includes("report.read")) notFound();
  const query = await searchParams;
  const current = new Date();
  const defaultFrom = `${current.getFullYear()}-01-01`;
  const defaultTo = current.toISOString().slice(0, 10);
  const params = new URLSearchParams({
    from: query.from ?? defaultFrom,
    to: query.to ?? defaultTo,
    ...Object.fromEntries(
      Object.entries(query).filter((entry): entry is [string, string] => Boolean(entry[1])),
    ),
  });
  const [data, lookups] = await Promise.all([
    fetchData<Report>(`/v1/reports/summary?${params}`),
    fetchData<Lookups>("/v1/lookups"),
  ]);
  const selectedResponsible = lookups.users.find((item) => item.id === query.responsibleId);
  const scope = selectedResponsible ? `Carteira de ${selectedResponsible.name}` : "Visão consolidada de todos os responsáveis";

  return (
    <AreaDashboard
      eyebrow="Gestão"
      title="Dashboard Gerencial"
      description={`${scope}, com empresas, processos, prazos e resultado financeiro.`}
      metrics={[
        { label: "Empresas ativas", value: data.companyClients, href: "/clientes?type=COMPANY", icon: Building2 },
        { label: "Clientes ativos", value: data.activeClients, href: "/clientes", icon: Users },
        { label: "Processos ativos no período", value: data.activeCases, href: "/processos", icon: Gavel },
        { label: "Processos finalizados", value: data.finalizedCases, href: "/processos?status=FINALIZADO", icon: BarChart3, tone: "positive" },
        { label: "Prazos próximos", value: data.upcomingDeadlines, href: "/prazos?view=next7", icon: CalendarClock, tone: data.upcomingDeadlines ? "warning" : "default" },
        { label: "Aguardando aprovação", value: data.approvalPending, href: "/prazos?status=PENDING_APPROVAL", icon: ClipboardCheck, tone: data.approvalPending ? "warning" : "default" },
        { label: "Receita recebida", value: formatMoney(data.revenue), href: "/financeiro/analise", icon: CircleDollarSign, tone: "special" },
        { label: "Inadimplentes +15 dias", value: data.delinquent, href: "/financeiro/inadimplencia", icon: TrendingDown, tone: data.delinquent ? "critical" : "default" },
      ]}
    >
      <form className="mb-6 flex flex-wrap items-end gap-2 rounded-xl border bg-card p-4">
        <label className="grid gap-1 text-xs text-muted-foreground">
          Período inicial
          <input name="from" type="date" defaultValue={query.from ?? defaultFrom} className="h-10 rounded-md border bg-background px-3 text-sm text-foreground" />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Período final
          <input name="to" type="date" defaultValue={query.to ?? defaultTo} className="h-10 rounded-md border bg-background px-3 text-sm text-foreground" />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Empresa / filial
          <select name="branchId" defaultValue={query.branchId} className="h-10 rounded-md border bg-background px-3 text-sm text-foreground">
            <option value="">Todas</option>
            {lookups.branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Área jurídica
          <select name="legalAreaId" defaultValue={query.legalAreaId} className="h-10 rounded-md border bg-background px-3 text-sm text-foreground">
            <option value="">Todas</option>
            {lookups.legalAreas.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Responsável
          <select name="responsibleId" defaultValue={query.responsibleId} className="h-10 min-w-56 rounded-md border bg-background px-3 text-sm text-foreground">
            <option value="">Carla, Rodolfo e demais</option>
            {lookups.users.map((item) => <option key={item.id} value={item.id}>{userOptionLabel(item)}</option>)}
          </select>
        </label>
        <Button type="submit" variant="secondary">Atualizar visão</Button>
      </form>
      <div className="grid gap-6 xl:grid-cols-3">
        <DataTable columns={["Processos por responsável", "Quantidade"]} rows={data.casesByResponsible.map((item) => [item.name, item.count])} />
        <DataTable columns={["Processos por empresa / filial", "Quantidade"]} rows={data.casesByBranch.map((item) => [item.name, item.count])} />
        <DataTable columns={["Processos por área", "Quantidade"]} rows={data.casesByArea.map((item) => [item.name, item.count])} />
      </div>
    </AreaDashboard>
  );
}
