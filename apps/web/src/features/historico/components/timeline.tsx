import { History } from "lucide-react";
import { formatDate } from "@/lib/format";

export interface TimelineItem {
  id: string;
  action: string;
  description: string;
  entityType: string;
  createdAt: string;
  actor?: { name: string };
}

export function Timeline({ items, emptyMessage = "Nenhuma alteração registrada." }: { items: TimelineItem[]; emptyMessage?: string }) {
  if (!items.length) return <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{emptyMessage}</div>;
  return <ol className="relative ml-3 border-l border-border">{items.map((item) => <li key={item.id} className="mb-6 ml-6 last:mb-0"><span className="absolute -left-3 grid h-6 w-6 place-items-center rounded-full border bg-background"><History className="h-3 w-3 text-primary" /></span><div className="rounded-lg border bg-card p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">{item.description}</p><time className="text-xs text-muted-foreground">{formatDate(item.createdAt, true)}</time></div><p className="mt-1 text-xs text-muted-foreground">{item.actor?.name ?? "Sistema"} · {item.action} · {item.entityType}</p></div></li>)}</ol>;
}
