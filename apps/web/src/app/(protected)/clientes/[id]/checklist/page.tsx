import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ClientChecklistManager } from "@/features/clientes/components/client-checklist-manager";
import { ClientDetailNav } from "@/features/clientes/components/client-detail-nav";
import { apiFetch, getCurrentUser } from "@/lib/server-api";

interface ClientData { id: string; name: string; primaryBranch: { name: string } }
interface ChecklistResponse { items: Array<{ id: string; name: string; items: Array<{ id: string; title: string; status: string; notes?: string }> }> }

export default async function ClientChecklistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [clientResponse, checklistResponse, user] = await Promise.all([
    apiFetch(`/v1/clients/${id}`),
    apiFetch(`/v1/checklists/clients/${id}`),
    getCurrentUser(),
  ]);
  if (clientResponse.status === 404 || checklistResponse.status === 404) notFound();
  if (!clientResponse.ok || !checklistResponse.ok) throw new Error("Não foi possível carregar o checklist do cliente.");
  const client = await clientResponse.json() as ClientData;
  const data = await checklistResponse.json() as ChecklistResponse;
  return <>
    <PageHeader eyebrow={client.primaryBranch.name} title={`Checklist — ${client.name}`} description="Documentos e providências do cliente, independentemente de um processo específico." />
    <ClientDetailNav clientId={id} />
    <ClientChecklistManager clientId={id} checklists={data.items} canManage={Boolean(user?.permissions.includes("checklist.manage"))} />
  </>;
}
