import { Banknote, CircleDollarSign, Receipt, TrendingDown, WalletCards } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { fetchData, type Lookups } from "@/lib/page-data";
import { userOptionLabel } from "@/lib/user-options";

interface FinanceAnalytics {
  year: number;
  totals: {
    contracted: string;
    costs: string;
    projected: string;
    received: string;
    overdue: string;
    receiptRate: number;
  };
  months: Array<{
    month: number;
    projected: string;
    received: string;
    overdue: string;
    projectedCount: number;
    receivedCount: number;
    overdueCount: number;
  }>;
  byBranch: FinanceCut[];
  byArea: FinanceCut[];
  byResponsible: FinanceCut[];
}

interface FinanceCut {
  name: string;
  contracts: number;
  amount: string;
}

type Query = {
  year?: string;
  branchId?: string;
  legalAreaId?: string;
  responsibleId?: string;
};

const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function CutTable({ title, rows }: { title: string; rows: FinanceCut[] }) {
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
      <DataTable
        columns={["Grupo", "Contratos", "Honorários"]}
        rows={rows.map((row) => [row.name, row.contracts, formatMoney(row.amount)])}
        emptyMessage="Nenhum contrato encontrado no período."
      />
    </section>
  );
}

export default async function FinanceAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const query = await searchParams;
  const year = query.year ?? String(new Date().getFullYear());
  const params = new URLSearchParams({
    year,
    ...Object.fromEntries(
      Object.entries(query).filter((entry): entry is [string, string] => Boolean(entry[1])),
    ),
  });
  const [data, lookups] = await Promise.all([
    fetchData<FinanceAnalytics>(`/v1/finance/analytics?${params}`),
    fetchData<Lookups>("/v1/lookups"),
  ]);
  const maxMonthlyValue = Math.max(
    1,
    ...data.months.flatMap((month) => [Number(month.projected), Number(month.received)]),
  );
  const cards = [
    ["Honorários contratados", formatMoney(data.totals.contracted), CircleDollarSign],
    ["Projeção anual", formatMoney(data.totals.projected), WalletCards],
    ["Recebido no ano", formatMoney(data.totals.received), Banknote],
    ["Vencido em aberto", formatMoney(data.totals.overdue), TrendingDown],
    ["Custas registradas", formatMoney(data.totals.costs), Receipt],
  ] as const;

  return (
    <>
      <PageHeader
        eyebrow="Controle financeiro"
        title={`Análise financeira de ${data.year}`}
        description="Projeções, pagamentos e distribuição da carteira conforme o modelo da planilha de controle financeiro."
      />
      <form className="mb-6 flex flex-wrap items-end gap-2 rounded-xl border bg-card p-4">
        <label className="grid gap-1 text-xs text-muted-foreground">
          Ano
          <input
            name="year"
            type="number"
            min="2000"
            max="2100"
            defaultValue={year}
            className="h-10 w-28 rounded-md border bg-background px-3 text-sm text-foreground"
          />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Empresa / filial
          <select name="branchId" defaultValue={query.branchId} className="h-10 rounded-md border bg-background px-3 text-sm text-foreground">
            <option value="">Todas</option>
            {lookups.branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Área jurídica
          <select name="legalAreaId" defaultValue={query.legalAreaId} className="h-10 rounded-md border bg-background px-3 text-sm text-foreground">
            <option value="">Todas</option>
            {lookups.legalAreas.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Responsável
          <select name="responsibleId" defaultValue={query.responsibleId} className="h-10 rounded-md border bg-background px-3 text-sm text-foreground">
            <option value="">Carla, Rodolfo e demais</option>
            {lookups.users.map((item) => <option key={item.id} value={item.id}>{userOptionLabel(item)}</option>)}
          </select>
        </label>
        <Button type="submit" variant="secondary">Aplicar filtros</Button>
      </form>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([label, value, Icon]) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
              <Icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">Projeção x recebimento mensal</CardTitle>
          <p className="text-sm text-muted-foreground">Índice de recebimento anual: {data.totals.receiptRate.toLocaleString("pt-BR")}%</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.months.map((month) => (
            <div key={month.month} className="grid gap-2 border-b pb-4 last:border-0 sm:grid-cols-[7rem_1fr_1fr_auto] sm:items-center">
              <p className="text-sm font-medium">{monthNames[month.month - 1]}</p>
              <div>
                <div className="mb-1 flex justify-between gap-2 text-xs text-muted-foreground"><span>Previsto</span><span>{formatMoney(month.projected)}</span></div>
                <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-cyan-500" style={{ width: `${(Number(month.projected) / maxMonthlyValue) * 100}%` }} /></div>
              </div>
              <div>
                <div className="mb-1 flex justify-between gap-2 text-xs text-muted-foreground"><span>Recebido</span><span>{formatMoney(month.received)}</span></div>
                <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${(Number(month.received) / maxMonthlyValue) * 100}%` }} /></div>
              </div>
              <p className="text-right text-xs text-muted-foreground">Vencido: <span className="font-medium text-destructive">{formatMoney(month.overdue)}</span></p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-8 xl:grid-cols-3">
        <CutTable title="Contratos por empresa / filial" rows={data.byBranch} />
        <CutTable title="Contratos por área jurídica" rows={data.byArea} />
        <CutTable title="Carteira por responsável" rows={data.byResponsible} />
      </div>
    </>
  );
}
