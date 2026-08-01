import { BriefcaseBusiness, CalendarClock, FileWarning, Gavel } from "lucide-react";
import { notFound } from "next/navigation";
import { AreaDashboard } from "@/features/dashboard/components/area-dashboard";
import { fetchData } from "@/lib/page-data";
import { getCurrentUser } from "@/lib/server-api";

interface Dashboard { activeCases: number; upcomingDeadlines: number; pendingDocuments: number; clients: number }
export default async function LegalDashboardPage() {
  const user = await getCurrentUser();
  if (!user?.permissions.some((permission) => ["case.read", "deadline.read"].includes(permission))) notFound();
  const data = await fetchData<Dashboard>("/v1/dashboard");
  return <AreaDashboard eyebrow="Jurídico" title="Dashboard Jurídico" description="Processos, prazos e pendências dentro do seu escopo de filial e responsabilidade." metrics={[
    { label: "Processos ativos", value: data.activeCases, href: "/processos", icon: Gavel },
    { label: "Prazos próximos", value: data.upcomingDeadlines, href: "/prazos?view=next7", icon: CalendarClock, tone: data.upcomingDeadlines ? "warning" : "default" },
    { label: "Documentos pendentes", value: data.pendingDocuments, href: "/processos", icon: FileWarning, tone: data.pendingDocuments ? "warning" : "default" },
    { label: "Clientes no escopo", value: data.clients, href: "/clientes", icon: BriefcaseBusiness },
  ]} />;
}

