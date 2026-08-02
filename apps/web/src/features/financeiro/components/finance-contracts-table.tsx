import Link from "next/link";
import { ApiActionButton } from "@/components/api-action-button";
import { CreatePanel } from "@/components/create-panel";
import { DataTable } from "@/components/data-table";
import { Pagination } from "@/components/pagination";
import { SearchForm } from "@/components/search-form";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatMoney } from "@/lib/format";
import { fetchData, type Lookups } from "@/lib/page-data";
import { getCurrentUser } from "@/lib/server-api";

interface FinanceList {
  items: Array<{
    id: string;
    paymentMethod: string;
    status: string;
    client: { name: string; phone?: string };
    branch: { name: string };
    case?: {
      caseName?: string;
      caseType: string;
      processNumber?: string;
      legalArea: { name: string };
      assignments: Array<{ user: { name: string } }>;
    };
    installments: Array<{ id: string; installmentNumber: number; amount: string; dueDate: string; status: string; agingStatus: string; paymentProofFileId?: string }>;
  }>;
  total: number;
  page: number;
  pageSize: number;
}

export async function FinanceContractsTable({ view, search, page, showCreate = false }: { view?: "upcoming" | "overdue" | "delinquent" | "paid" | "cancelled"; search?: string; page?: string; showCreate?: boolean }) {
  const params = new URLSearchParams({ page: page ?? "1" });
  if (search) params.set("search", search);
  if (view) params.set("view", view);
  const [data, lookups, user] = await Promise.all([
    fetchData<FinanceList>(`/v1/finance/contracts?${params}`),
    fetchData<Lookups>("/v1/lookups"),
    getCurrentUser(),
  ]);
  const canUpdate = Boolean(user?.permissions.includes("finance.update"));
  const matchesView = (installment: FinanceList["items"][number]["installments"][number]) =>
    !view ||
    (view === "upcoming" && ["A_VENCER", "EM_DIA"].includes(installment.agingStatus)) ||
    (view === "overdue" && ["VENCIDO", "INADIMPLENTE_15_DIAS"].includes(installment.agingStatus)) ||
    (view === "delinquent" && installment.agingStatus === "INADIMPLENTE_15_DIAS") ||
    (view === "paid" && installment.status === "PAID") ||
    view === "cancelled";
  const rows = data.items.flatMap((contract) => contract.installments.filter(matchesView).map((installment) => [
    <Link key={installment.id} href={`/financeiro/contratos/${contract.id}`} className="font-medium text-cyan-600 hover:underline"><span className="block">{contract.client.name}</span><span className="text-xs text-muted-foreground">Parcela {installment.installmentNumber}/{contract.installments.length}{contract.client.phone ? ` · ${contract.client.phone}` : ""}</span></Link>,
    <span key="case"><span className="block">{contract.case?.caseName ?? contract.case?.processNumber ?? "Sem processo"}</span>{contract.case && <span className="text-xs text-muted-foreground">{contract.case.processNumber ?? contract.case.caseType}</span>}</span>,
    <span key="responsible"><span className="block">{contract.case?.assignments.map((item) => item.user.name).join(", ") || "Não definido"}</span>{contract.case && <span className="text-xs text-muted-foreground">{contract.case.legalArea.name}</span>}</span>,
    contract.branch.name,
    formatMoney(installment.amount),
    formatDate(installment.dueDate),
    contract.paymentMethod.replaceAll("_", " "),
    <StatusBadge key="status" value={installment.agingStatus} />,
    installment.status === "PAID" ? "Pago" : canUpdate ? <ApiActionButton key="pay" endpoint={`/api/v1/finance/installments/${installment.id}/pay`} body={{ paidAt: new Date().toISOString() }} label="Registrar pagamento" confirmMessage="Confirmar o recebimento desta parcela?" /> : "Pendente",
  ]));
  return <>
    {showCreate && canUpdate && <div className="mb-4 flex justify-end"><CreatePanel title="Novo contrato de honorários" endpoint="/api/v1/finance/contracts" buttonLabel="Novo contrato" fields={[{ name: "clientId", label: "Cliente", type: "select", required: true, options: lookups.clients.map((item) => ({ value: item.id, label: item.name })) }, { name: "caseId", label: "Processo", type: "select", options: lookups.cases.map((item) => ({ value: item.id, label: item.name })) }, { name: "branchId", label: "Filial", type: "select", required: true, options: lookups.branches.map((item) => ({ value: item.id, label: item.name })) }, { name: "feeAmount", label: "Honorários", type: "number", required: true }, { name: "costAmount", label: "Custas", type: "number", defaultValue: 0 }, { name: "paymentMethod", label: "Forma de pagamento", type: "select", required: true, options: ["CASH", "PIX", "BANK_TRANSFER", "CREDIT_CARD", "DEBIT_CARD", "BOLETO_MANUAL", "OTHER"].map((value) => ({ value, label: value.replaceAll("_", " ") })) }, { name: "paymentTiming", label: "Momento", type: "select", required: true, options: [{ value: "UPFRONT", label: "No início" }, { value: "END_OF_CASE", label: "Ao final" }, { value: "INSTALLMENTS", label: "Parcelado" }] }, { name: "installmentCount", label: "Parcelas", type: "number", required: true, defaultValue: 1 }, { name: "firstDueDate", label: "Primeiro vencimento", type: "date", required: true }, { name: "notes", label: "Observações", type: "textarea" }]} /></div>}
    <SearchForm defaultValue={search} placeholder="Cliente, processo ou nome interno" />
    <DataTable columns={["Cliente / parcela", "Processo", "Responsável / área", "Filial", "Valor", "Vencimento", "Forma", "Situação", "Ação"]} rows={rows} emptyMessage="Nenhuma parcela encontrada." />
    <Pagination page={data.page} pageSize={data.pageSize} total={data.total} searchParams={{ search, view }} />
  </>;
}
