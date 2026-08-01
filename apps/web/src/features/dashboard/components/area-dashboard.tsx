import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";

export interface DashboardMetric {
  label: string;
  value: React.ReactNode;
  href: string;
  icon: LucideIcon;
  tone?: "default" | "warning" | "critical" | "positive" | "special";
}

const tones = {
  default: "text-primary",
  warning: "text-warning",
  critical: "text-destructive",
  positive: "text-success",
  special: "text-telun-dourado",
};

export function AreaDashboard({ eyebrow, title, description, metrics, children }: { eyebrow: string; title: string; description: string; metrics: DashboardMetric[]; children?: React.ReactNode }) {
  return <>
    <PageHeader eyebrow={eyebrow} title={title} description={description} />
    <section className="overflow-hidden rounded-lg border bg-card" aria-label="Indicadores"><div className="grid sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric, index) => { const Icon = metric.icon; return <Link key={metric.label} href={metric.href} className={cn("group flex min-h-28 items-start justify-between gap-4 p-5 transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary", index > 0 && "border-t sm:border-t-0 sm:border-l", index >= 2 && "sm:border-t xl:border-t-0", index >= 4 && "xl:border-t")}><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{metric.label}</p><p className="mt-3 text-2xl font-semibold tracking-tight">{metric.value}</p></div><Icon className={cn("mt-0.5 h-4 w-4 transition-transform group-hover:translate-x-0.5", tones[metric.tone ?? "default"])} /></Link>; })}</div></section>
    {children && <div className="mt-6">{children}</div>}
  </>;
}

