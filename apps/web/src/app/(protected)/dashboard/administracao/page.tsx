import { Building2, History, ShieldCheck, UserCheck, UserX, Users } from "lucide-react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DataTable } from "@/components/data-table";
import { AreaDashboard } from "@/features/dashboard/components/area-dashboard";
import { formatDate } from "@/lib/format";
import { fetchData } from "@/lib/page-data";
import { getCurrentUser } from "@/lib/server-api";

interface AdminOverview { users: Array<{ id: string; name: string; status: string }>; branches: Array<{ id: string; name: string }>; legalAreas: Array<{ id: string; name: string }>; roles: Array<{ id: string; name: string }> }
interface RecentHistory { items: Array<{ id: string; createdAt: string; actorName?: string; action: string; description: string }> }

export default async function AdministrativeDashboardPage() {
  const user = await getCurrentUser();
  if (!user?.permissions.includes("user.manage")) notFound();
  const [overview, history] = await Promise.all([fetchData<AdminOverview>("/v1/admin/overview"), user.permissions.includes("audit.read") ? fetchData<RecentHistory>("/v1/audit?pageSize=8") : Promise.resolve({ items: [] })]);
  const active = overview.users.filter((item) => item.status === "ACTIVE").length;
  const blocked = overview.users.filter((item) => ["SUSPENDED", "ARCHIVED"].includes(item.status)).length;
  return <AreaDashboard eyebrow="Administração" title="Dashboard Administrativo" description="Acesso, estrutura organizacional e eventos sensíveis do ambiente." metrics={[
    { label: "Usuários ativos", value: active, href: "/administracao/usuarios?status=ACTIVE", icon: UserCheck, tone: "positive" },
    { label: "Usuários bloqueados", value: blocked, href: "/administracao/usuarios?status=SUSPENDED", icon: UserX, tone: blocked ? "warning" : "default" },
    { label: "Perfis", value: overview.roles.length, href: "/administracao/perfis", icon: ShieldCheck },
    { label: "Filiais", value: overview.branches.length, href: "/administracao/filiais", icon: Building2 },
    { label: "Departamentos e áreas", value: overview.legalAreas.length, href: "/administracao/areas", icon: Users },
    ...(user.permissions.includes("audit.read") ? [{ label: "Eventos recentes", value: history.items.length, href: "/historico", icon: History, tone: "special" as const }] : []),
  ]}>{user.permissions.includes("audit.read") && <section><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Atividade recente</h2><Link href="/historico" className="text-sm text-primary hover:underline">Abrir histórico completo</Link></div><DataTable columns={["Data", "Usuário", "Ação", "Descrição"]} rows={history.items.map((item) => [formatDate(item.createdAt, true), item.actorName ?? "Sistema", item.action, item.description])} /></section>}</AreaDashboard>;
}
