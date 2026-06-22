import { ModuleNav } from "@/features/shared/components/module-nav";

export function FinanceNav() { return <ModuleNav items={[{ label: "Visão geral", href: "/financeiro" }, { label: "Contratos", href: "/financeiro/contratos" }, { label: "Parcelas", href: "/financeiro/parcelas" }, { label: "Inadimplência", href: "/financeiro/inadimplencia" }, { label: "Comprovantes", href: "/financeiro/comprovantes" }]} />; }
