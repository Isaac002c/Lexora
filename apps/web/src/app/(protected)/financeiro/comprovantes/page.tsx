import { PageHeader } from "@/components/page-header";
import { FinanceContractsTable } from "@/features/financeiro/components/finance-contracts-table";
export default async function ProofsPage({ searchParams }: { searchParams: Promise<{ search?: string; page?: string }> }) { const query = await searchParams; return <><PageHeader eyebrow="Arquivos financeiros" title="Comprovantes" description="Acesse um contrato ou parcela para anexar e baixar comprovantes." /><FinanceContractsTable search={query.search} page={query.page} /></>; }
