import Link from "next/link";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "./status-badge";

interface CalendarDeadline { id: string; caseId?: string; title: string; dueAt: string; color: string; client: { name: string }; responsibleUser?: { name: string } }
function dateKey(value: Date | string) { const date = new Date(value); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function DeadlineItems({ items, compact = false }: { items: CalendarDeadline[]; compact?: boolean }) { return <div className="space-y-2">{items.map((item) => <div key={item.id} className="rounded border-l-2 border-primary bg-muted/40 p-2"><p className="truncate text-xs font-medium">{item.title}</p>{!compact && <><p className="truncate text-xs text-muted-foreground">{item.client.name}</p><div className="mt-1 flex items-center justify-between gap-2"><StatusBadge value={item.color} />{item.caseId && <Link className="text-xs text-cyan-600" href={`/processos/${item.caseId}`}>Processo</Link>}</div></>}</div>)}</div>; }

export function DeadlineCalendar({ items, mode = "list", referenceDate }: { items: CalendarDeadline[]; mode?: "month" | "week" | "list"; referenceDate?: string }) {
  const reference = referenceDate ? new Date(`${referenceDate}T12:00:00`) : new Date();
  const groups = new Map<string, CalendarDeadline[]>(); for (const item of items) { const key = dateKey(item.dueAt); groups.set(key, [...(groups.get(key) ?? []), item]); }
  if (mode === "list") return <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{[...groups.entries()].slice(0, 12).map(([date, deadlines]) => <div key={date} className="rounded-xl border bg-card p-4"><p className="mb-3 text-sm font-semibold">{formatDate(`${date}T12:00:00`)}</p><DeadlineItems items={deadlines} /></div>)}</div>;
  const start = mode === "month" ? new Date(reference.getFullYear(), reference.getMonth(), 1) : new Date(reference);
  start.setDate(start.getDate() - start.getDay());
  const count = mode === "month" ? 42 : 7;
  const days = Array.from({ length: count }, (_, index) => { const day = new Date(start); day.setDate(start.getDate() + index); return day; });
  return <div className="mb-6 overflow-x-auto"><div className={mode === "month" ? "grid min-w-[900px] grid-cols-7 overflow-hidden rounded-xl border" : "grid min-w-[900px] grid-cols-7 gap-3"}>{days.map((day) => { const key = dateKey(day); const outsideMonth = mode === "month" && day.getMonth() !== reference.getMonth(); return <div key={key} className={mode === "month" ? `min-h-32 border-b border-r p-2 ${outsideMonth ? "bg-muted/20 text-muted-foreground" : "bg-card"}` : "min-h-64 rounded-xl border bg-card p-3"}><p className="mb-2 text-xs font-semibold uppercase">{day.toLocaleDateString("pt-BR", { weekday: mode === "week" ? "short" : undefined, day: "2-digit", month: mode === "week" ? "2-digit" : undefined })}</p><DeadlineItems items={groups.get(key) ?? []} compact={mode === "month"} /></div>; })}</div></div>;
}
