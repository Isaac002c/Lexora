import { Inbox } from "lucide-react";

export function DataTable({ columns, rows, emptyMessage = "Nenhum registro encontrado." }: { columns: string[]; rows: React.ReactNode[][]; emptyMessage?: string }) {
  if (!rows.length) return <div className="grid min-h-56 place-items-center rounded-xl border border-dashed bg-card"><div className="text-center"><Inbox className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">{emptyMessage}</p></div></div>;
  return <div className="overflow-hidden rounded-xl border bg-card"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground"><tr>{columns.map((column) => <th key={column} className="whitespace-nowrap px-4 py-3 font-medium">{column}</th>)}</tr></thead><tbody className="divide-y">{rows.map((row, index) => <tr key={index} className="hover:bg-muted/30">{row.map((cell, cellIndex) => <td key={cellIndex} className="max-w-xs px-4 py-3 align-middle">{cell}</td>)}</tr>)}</tbody></table></div></div>;
}
