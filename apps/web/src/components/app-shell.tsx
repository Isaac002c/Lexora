"use client";

import { BarChart3, Building2, CalendarDays, CheckSquare, CircleDollarSign, ClipboardList, FileText, Gavel, LayoutDashboard, LogOut, Menu, Scale, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { CSSProperties } from "react";
import type { CurrentUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

const items = [
  ["Dashboard", "/dashboard", LayoutDashboard, "dashboard.read"],
  ["Atendimentos", "/atendimentos", ClipboardList, "attendance.read"],
  ["Clientes", "/clientes", Users, "client.read"],
  ["Processos", "/processos", Gavel, "case.read"],
  ["Prazos", "/prazos", CalendarDays, "deadline.read"],
  ["Calendário", "/calendario", CalendarDays, "deadline.read"],
  ["Documentos", "/documentos", FileText, "document.read"],
  ["Checklists", "/checklists", CheckSquare, "document.read"],
  ["Financeiro", "/financeiro", CircleDollarSign, "finance.read"],
  ["Relatórios", "/relatorios", BarChart3, "report.read"],
  ["Administração", "/administracao", Building2, "administration"],
] as const;

export function AppShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const visibleItems = items.filter((item) => item[3] === "administration"
    ? user.permissions.some((permission) => ["user.manage", "branch.manage", "legal_area.manage", "audit.read", "tenant.configure"].includes(permission))
    : user.permissions.includes(item[3]));

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const sidebar = (
    <aside className="flex h-full w-72 flex-col border-r border-white/10 bg-navy-950">
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6"><Scale className="h-6 w-6 text-cyan-400" /><div><p className="font-semibold tracking-widest text-white">LEXORA</p><p className="max-w-48 truncate text-xs text-slate-500">{user.tenantName}</p></div></div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {visibleItems.map(([label, href, Icon]) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return <Link key={href} href={href} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors", active ? "bg-cyan-400/10 text-cyan-300" : "text-slate-400 hover:bg-white/5 hover:text-white")}><Icon className="h-4 w-4" />{label}</Link>;
        })}
      </nav>
      <div className="border-t border-white/10 p-4"><div className="mb-3 px-2"><p className="truncate text-sm font-medium text-white">{user.userName}</p><p className="truncate text-xs text-slate-500">{user.userEmail}</p></div><Button variant="ghost" className="w-full justify-start gap-3 text-slate-400" onClick={signOut}><LogOut className="h-4 w-4" />Sair</Button></div>
    </aside>
  );

  const hex = user.primaryColor.replace("#", "");
  const red = parseInt(hex.slice(0, 2), 16) / 255; const green = parseInt(hex.slice(2, 4), 16) / 255; const blue = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(red, green, blue); const min = Math.min(red, green, blue); let hue = 0; const lightness = (max + min) / 2; const delta = max - min; const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  if (delta) { if (max === red) hue = 60 * (((green - blue) / delta) % 6); else if (max === green) hue = 60 * ((blue - red) / delta + 2); else hue = 60 * ((red - green) / delta + 4); }
  if (hue < 0) hue += 360;
  const themeStyle = { "--primary": `${hue.toFixed(0)} ${(saturation * 100).toFixed(0)}% ${(lightness * 100).toFixed(0)}%`, "--ring": `${hue.toFixed(0)} ${(saturation * 100).toFixed(0)}% ${(lightness * 100).toFixed(0)}%` } as CSSProperties;

  return (
    <div className="min-h-screen bg-background" style={themeStyle}>
      <div className="fixed inset-y-0 left-0 z-30 hidden lg:block">{sidebar}</div>
      {open && <div className="fixed inset-0 z-40 lg:hidden"><button className="absolute inset-0 bg-black/70" aria-label="Fechar menu" onClick={() => setOpen(false)} /><div className="relative h-full w-72">{sidebar}<Button variant="ghost" size="icon" className="absolute right-3 top-5" onClick={() => setOpen(false)}><X /></Button></div></div>}
      <header className="sticky top-0 z-20 flex h-16 items-center border-b bg-background/90 px-4 backdrop-blur lg:ml-72 lg:px-8"><Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}><Menu /></Button><div className="ml-auto text-xs text-muted-foreground">{user.roles.map((role) => role.replaceAll("_", " ")).join(" • ")}</div></header>
      <main className="p-4 lg:ml-72 lg:p-8">{children}</main>
    </div>
  );
}
