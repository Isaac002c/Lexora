import Link from "next/link";
import { Button } from "./ui/button";

export function Pagination({ page, pageSize, total, searchParams = {} }: { page: number; pageSize: number; total: number; searchParams?: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (nextPage: number) => `?${new URLSearchParams({ ...Object.fromEntries(Object.entries(searchParams).filter((x): x is [string, string] => Boolean(x[1]))), page: String(nextPage) })}`;
  return <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground"><span>Página {page} de {pages} · {total} registros</span><div className="flex gap-2"><Button asChild variant="outline" size="sm" disabled={page <= 1}><Link aria-disabled={page <= 1} href={href(Math.max(1, page - 1))}>Anterior</Link></Button><Button asChild variant="outline" size="sm" disabled={page >= pages}><Link aria-disabled={page >= pages} href={href(Math.min(pages, page + 1))}>Próxima</Link></Button></div></div>;
}
