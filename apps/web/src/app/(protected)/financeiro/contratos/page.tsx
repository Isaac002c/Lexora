import { PageHeader } from "@/components/page-header";
import { FinanceContractsTable } from "@/features/financeiro/components/finance-contracts-table";
export default async function ContractsPage({ searchParams }: { searchParams: Promise<{ search?: string; page?: string }> }) { const query = await searchParams; return <><PageHeader eyebrow="Honorários e custas" title="Contratos financeiros" description="Contratos vinculados a clientes e processos." /><FinanceContractsTable search={query.search} page={query.page} showCreate /></>; }
