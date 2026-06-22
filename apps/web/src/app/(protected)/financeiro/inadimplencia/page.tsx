import { PageHeader } from "@/components/page-header";
import { FinanceContractsTable } from "@/features/financeiro/components/finance-contracts-table";
export default async function DelinquencyPage({ searchParams }: { searchParams: Promise<{ search?: string; page?: string }> }) { const query = await searchParams; return <><PageHeader eyebrow="Mais de 15 dias" title="Inadimplência" description="Clientes e parcelas que exigem acompanhamento interno de cobrança." /><FinanceContractsTable view="delinquent" search={query.search} page={query.page} /></>; }
