import { BarChart3, CalendarClock, CircleDollarSign, Gavel, History, TrendingDown } from "lucide-react";
import { notFound } from "next/navigation";
import { AreaDashboard } from "@/features/dashboard/components/area-dashboard";
import { formatMoney } from "@/lib/format";
import { fetchData } from "@/lib/page-data";
import { getCurrentUser } from "@/lib/server-api";

interface Report { attendedClients: number; revenue: string; delinquent: number; activeCases: number; finalizedCases: number; upcomingDeadlines: number; pendingDocuments: number }
interface HistoryCount { total: number }
export default async function ManagementDashboardPage() {
  const user = await getCurrentUser();
  if (!user?.permissions.includes("report.read")) notFound();
  const [data, history] = await Promise.all([fetchData<Report>("/v1/reports/summary"), user.permissions.includes("audit.read") ? fetchData<HistoryCount>("/v1/audit?pageSize=1") : Promise.resolve({ total: 0 })]);
  return <AreaDashboard eyebrow="Gestão" title="Dashboard Gerencial" description="Indicadores jurídicos, financeiros e de governança consolidados no período atual." metrics={[
    { label: "Processos ativos", value: data.activeCases, href: "/processos", icon: Gavel },
    { label: "Processos finalizados", value: data.finalizedCases, href: "/processos?status=FINALIZADO", icon: BarChart3, tone: "positive" },
    { label: "Prazos próximos", value: data.upcomingDeadlines, href: "/prazos?view=next7", icon: CalendarClock, tone: data.upcomingDeadlines ? "warning" : "default" },
    { label: "Receita recebida", value: formatMoney(data.revenue), href: "/financeiro", icon: CircleDollarSign, tone: "special" },
    { label: "Inadimplentes", value: data.delinquent, href: "/financeiro/inadimplencia", icon: TrendingDown, tone: data.delinquent ? "critical" : "default" },
    { label: "Atendimentos convertidos", value: data.attendedClients, href: "/atendimentos", icon: BarChart3 },
    ...(user.permissions.includes("audit.read") ? [{ label: "Eventos auditados", value: history.total, href: "/historico", icon: History, tone: "default" as const }] : []),
  ]} />;
}

