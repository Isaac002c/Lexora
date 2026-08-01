"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";

interface SearchResult {
  type: string;
  id: string;
  title: string;
  context: string;
  href: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);
  useEffect(() => {
    if (query.trim().length < 2) {
      setItems([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const response = await fetch(
        `/api/v1/search?q=${encodeURIComponent(query.trim())}`,
        { signal: controller.signal },
      );
      if (response.ok)
        setItems(((await response.json()) as { items: SearchResult[] }).items);
      setLoading(false);
    }, 220);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        onClick={() => setOpen(true)}
        title="Busca global (Ctrl+K)"
      >
        <Search className="h-4 w-4" />
        <span className="hidden xl:inline">Buscar</span>
        <kbd className="text-muted-foreground hidden rounded border px-1 text-[10px] xl:inline">
          Ctrl K
        </kbd>
      </Button>
      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-start justify-center bg-black/65 px-4 pt-[12vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Busca global"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="bg-background w-full max-w-2xl overflow-hidden rounded-lg border shadow-2xl">
            <div className="flex items-center gap-2 border-b px-4">
              <Search className="text-muted-foreground h-4 w-4" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-14 flex-1 bg-transparent text-sm outline-none"
                placeholder="Clientes, processos, prazos, documentos, contratos…"
                aria-label="Termo de busca"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
              >
                <X />
              </Button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-2">
              {query.length < 2 && (
                <p className="text-muted-foreground p-6 text-center text-sm">
                  Digite ao menos 2 caracteres.
                </p>
              )}
              {loading && (
                <p className="text-muted-foreground p-6 text-center text-sm">
                  Buscando…
                </p>
              )}
              {!loading && query.length >= 2 && !items.length && (
                <p className="text-muted-foreground p-6 text-center text-sm">
                  Nenhum resultado autorizado.
                </p>
              )}
              {!loading &&
                items.map((item) => (
                  <Link
                    key={`${item.type}:${item.id}`}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="hover:bg-muted focus-visible:ring-primary flex items-center gap-3 rounded-md px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2"
                  >
                    <span className="text-primary w-24 shrink-0 text-[10px] font-semibold uppercase tracking-wide">
                      {item.type}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {item.title}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {item.context}
                      </span>
                    </span>
                  </Link>
                ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
