import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server-api";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.roles.includes("ADMIN_GERAL") && user.permissions.includes("user.manage")) redirect("/dashboard/administracao");
  if (user.roles.includes("GESTOR_FILIAL") && user.permissions.includes("report.read")) redirect("/dashboard/gestao");
  if (user.roles.includes("SECRETARIA") && user.permissions.includes("attendance.read")) redirect("/dashboard/secretaria");
  if (user.roles.includes("ADMINISTRATIVO") && user.permissions.includes("attendance.read")) redirect("/dashboard/secretaria");
  if (user.roles.includes("ADVOGADO") && user.permissions.includes("case.read")) redirect("/dashboard/juridico");
  if (user.roles.includes("FINANCEIRO") && user.permissions.includes("finance.read")) redirect("/dashboard/financeiro");
  if (user.permissions.includes("case.read")) redirect("/dashboard/juridico");
  if (user.permissions.includes("finance.read")) redirect("/dashboard/financeiro");
  if (user.permissions.includes("attendance.read")) redirect("/dashboard/secretaria");
  redirect("/clientes");
}
