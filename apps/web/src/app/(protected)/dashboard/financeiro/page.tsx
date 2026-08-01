import { CalendarClock, CircleDollarSign, FileWarning, TrendingDown } from "lucide-react";
import { notFound } from "next/navigation";
import { AreaDashboard } from "@/features/dashboard/components/area-dashboard";
import { formatMoney } from "@/lib/format";
import { fetchData } from "@/lib/page-data";
import { getCurrentUser } from "@/lib/server-api";

interface FinanceSummary { contracted: string; activeContracts: number; upcoming: number; overdue: number; delinquent: number; receivedThisMonth: string; costs: string; completedContracts: number }
export default async function FinancialDashboardPage() {
  const user = await getCurrentUser();
  if (!user?.permissions.includes("finance.read")) notFound();
  const data = await fetchData<FinanceSummary>("/v1/finance/summary");
  return <AreaDashboard eyebrow="Financeiro" title="Dashboard Financeiro" description="Valores previstos, recebidos e vencidos dentro do escopo autorizado." metrics={[
    { label: "Honorários contratados", value: formatMoney(data.contracted), href: "/financeiro/contratos", icon: CircleDollarSign, tone: "special" },
    { label: "Recebido no mês", value: formatMoney(data.receivedThisMonth), href: "/financeiro/parcelas?view=paid", icon: CircleDollarSign, tone: "positive" },
    { label: "Próximos vencimentos", value: data.upcoming, href: "/financeiro/parcelas?view=upcoming", icon: CalendarClock },
    { label: "Parcelas vencidas", value: data.overdue, href: "/financeiro/parcelas?view=overdue", icon: FileWarning, tone: data.overdue ? "critical" : "default" },
    { label: "Inadimplência +15 dias", value: data.delinquent, href: "/financeiro/inadimplencia", icon: TrendingDown, tone: data.delinquent ? "critical" : "default" },
    { label: "Contratos ativos", value: data.activeContracts, href: "/financeiro/contratos", icon: CircleDollarSign },
  ]} />;
}

