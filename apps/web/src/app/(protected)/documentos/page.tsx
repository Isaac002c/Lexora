import Link from "next/link";
import { DataTable } from "@/components/data-table";
import { CreatePanel } from "@/components/create-panel";
import { PageHeader } from "@/components/page-header";
import { SearchForm } from "@/components/search-form";
import { StatusBadge } from "@/components/status-badge";
import { UploadPanel } from "@/components/upload-panel";
import { formatDate } from "@/lib/format";
import { fetchData, type Lookups } from "@/lib/page-data";
import { ModuleNav } from "@/features/shared/components/module-nav";
import { getCurrentUser } from "@/lib/server-api";

interface DocumentList {
  items: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    sentAt: string;
    branch: { name: string };
    client?: { name: string };
    case?: { caseType: string; processNumber?: string };
    uploadedBy: { name: string };
    storedFile?: { originalName: string; sizeBytes: string };
  }>;
  total: number;
}
export default async function DocumentsPage({
  searchParams,
}: {
    searchParams: Promise<{ search?: string; status?: string; clientId?: string; caseId?: string }>;
}) {
  const query = await searchParams; const { search, status } = query;
  const [data, lookups, user] = await Promise.all([
    fetchData<DocumentList>(
      `/v1/documents?${new URLSearchParams({ search: search ?? "", status: status ?? "", clientId: query.clientId ?? "", caseId: query.caseId ?? "" })}`,
    ),
    fetchData<Lookups>("/v1/lookups"),
    getCurrentUser(),
  ]);
  return (
    <>
      <PageHeader
        eyebrow={`${data.total} documentos`}
        title="Documentos"
        description="Arquivos privados, rastreados e vinculados aos registros jurídicos."
        action={<UploadPanel lookups={lookups} />}
      />
      <ModuleNav items={[{ label: "Todos", href: "/documentos" }, { label: "Pendentes", href: "/documentos?status=PENDING" }, { label: "Recebidos", href: "/documentos?status=RECEIVED" }, { label: "Em análise", href: "/documentos?status=UNDER_REVIEW" }, { label: "Aprovados", href: "/documentos?status=APPROVED" }, { label: "Recusados", href: "/documentos?status=REJECTED" }]} />
      <SearchForm defaultValue={search} placeholder="Documento ou cliente"><select name="clientId" defaultValue={query.clientId} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Todos os clientes</option>{lookups.clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select name="caseId" defaultValue={query.caseId} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Todos os processos</option>{lookups.cases.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></SearchForm>
      <DataTable
        columns={[
          "Documento",
          "Cliente / processo",
          "Filial",
          "Enviado por",
          "Data",
          "Status",
          "Arquivo",
          "Ações",
        ]}
        rows={data.items.map((item) => [
          <span key={item.id}>
            <span className="block font-medium">{item.name}</span>
            <span className="text-muted-foreground text-xs">{item.type}</span>
          </span>,
          <span key="relation">
            <span className="block">{item.client?.name ?? "—"}</span>
            <span className="text-muted-foreground text-xs">
              {item.case?.processNumber ?? item.case?.caseType}
            </span>
          </span>,
          item.branch.name,
          item.uploadedBy.name,
          formatDate(item.sentAt, true),
          <StatusBadge key="status" value={item.status} />,
          item.storedFile ? (
            <Link
              key="download"
              href={`/api/v1/documents/${item.id}/download`}
              className="text-cyan-600 hover:underline"
            >
              Baixar
            </Link>
          ) : (
            "Pendente"
          ),
          user?.permissions.includes("document.upload") ? <CreatePanel key={`status-${item.id}`} title={`Atualizar ${item.name}`} endpoint={`/api/v1/documents/${item.id}`} method="PATCH" buttonLabel="Alterar status" fields={[{ name: "status", label: "Status", type: "select", required: true, defaultValue: item.status, options: ["PENDING", "RECEIVED", "UNDER_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"].map((value) => ({ value, label: value.replaceAll("_", " ") })) }, { name: "notes", label: "Motivo / observações", type: "textarea" }]} /> : "—",
        ])}
      />
    </>
  );
}
