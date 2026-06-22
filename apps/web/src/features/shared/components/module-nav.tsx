"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export interface ModuleNavItem {
  label: string;
  href: string;
  permission?: string;
}

export function ModuleNav({
  items,
  permissions,
}: {
  items: ModuleNavItem[];
  permissions?: string[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visible = items.filter(
    (item) => !item.permission || permissions?.includes(item.permission),
  );
  const navigationKeys = new Set(
    visible.flatMap((item) => [
      ...new URLSearchParams(item.href.split("?")[1] ?? "").keys(),
    ]),
  );

  return (
    <nav
      className="mb-6 flex gap-2 overflow-x-auto border-b pb-3"
      aria-label="Navegação do módulo"
    >
      {visible.map((item) => {
        const [targetPath, targetQuery] = item.href.split("?");
        const targetParams = new URLSearchParams(targetQuery ?? "");
        const queryMatches = targetParams.size
          ? [...targetParams.entries()].every(
              ([key, value]) => searchParams.get(key) === value,
            )
          : [...navigationKeys].every((key) => !searchParams.has(key));
        const active = pathname === targetPath && queryMatches;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
