import { CalendarClock, ClipboardList, FileWarning, UserPlus } from "lucide-react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AreaDashboard } from "@/features/dashboard/components/area-dashboard";
import { fetchData } from "@/lib/page-data";
import { getCurrentUser } from "@/lib/server-api";

interface Dashboard { clients: number; attendances: number; pendingDocuments: number; upcomingDeadlines: number }
export default async function SecretariatDashboardPage() {
  const user = await getCurrentUser();
  if (!user?.permissions.includes("attendance.read")) notFound();
  const data = await fetchData<Dashboard>("/v1/dashboard");
  return <AreaDashboard eyebrow="Secretaria" title="Dashboard da Secretaria" description="Entradas, retornos e cadastros que precisam de encaminhamento." metrics={[
    { label: "Atendimentos no mês", value: data.attendances, href: "/atendimentos", icon: ClipboardList },
    { label: "Clientes cadastrados", value: data.clients, href: "/clientes", icon: UserPlus },
    { label: "Documentos iniciais pendentes", value: data.pendingDocuments, href: "/atendimentos", icon: FileWarning, tone: data.pendingDocuments ? "warning" : "default" },
    { label: "Compromissos próximos", value: data.upcomingDeadlines, href: "/calendario", icon: CalendarClock },
  ]}><div className="flex flex-wrap gap-3"><Link className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" href="/atendimentos">Novo atendimento</Link><Link className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted" href="/calendario">Abrir agenda</Link></div></AreaDashboard>;
}
