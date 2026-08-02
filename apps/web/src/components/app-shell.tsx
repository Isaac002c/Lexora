"use client";

import {
  BarChart3,
  Building2,
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Gavel,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { CurrentUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import { BrandWordmark } from "./brand-wordmark";
import { ThemeProvider } from "./theme-provider";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";
import { WorkspaceTabBar, WorkspaceTabsProvider } from "./workspace-tabs";
import { GlobalSearch } from "./global-search";
import { NotificationMenu } from "./notification-menu";

type NavIcon = typeof LayoutDashboard;
interface NavItem {
  label: string;
  href: string;
  icon: NavIcon;
  permissions: string[];
}
interface NavSection {
  label: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    label: "Administração",
    items: [
      {
        label: "Dashboard Administrativo",
        href: "/dashboard/administracao",
        icon: LayoutDashboard,
        permissions: ["user.manage"],
      },
      {
        label: "Usuários",
        href: "/administracao/usuarios",
        icon: Users,
        permissions: ["user.manage"],
      },
      {
        label: "Perfis e Permissões",
        href: "/administracao/perfis",
        icon: ShieldCheck,
        permissions: ["user.manage"],
      },
      {
        label: "Departamentos e Áreas",
        href: "/administracao/areas",
        icon: Building2,
        permissions: ["legal_area.manage"],
      },
      {
        label: "Empresas e Filiais",
        href: "/administracao/filiais",
        icon: Building2,
        permissions: ["branch.manage"],
      },
      {
        label: "Configurações",
        href: "/administracao/configuracoes",
        icon: Settings,
        permissions: ["tenant.configure"],
      },
    ],
  },
  {
    label: "Secretaria",
    items: [
      {
        label: "Dashboard da Secretaria",
        href: "/dashboard/secretaria",
        icon: LayoutDashboard,
        permissions: ["attendance.read"],
      },
      {
        label: "Central de Entradas",
        href: "/atendimentos",
        icon: ClipboardList,
        permissions: ["attendance.read"],
      },
    ],
  },
  {
    label: "Jurídico",
    items: [
      {
        label: "Dashboard Jurídico",
        href: "/dashboard/juridico",
        icon: LayoutDashboard,
        permissions: ["case.read", "deadline.read"],
      },
      {
        label: "Clientes e Processos",
        href: "/clientes",
        icon: Users,
        permissions: ["client.read"],
      },
      {
        label: "Processos",
        href: "/processos",
        icon: Gavel,
        permissions: ["case.read"],
      },
      {
        label: "Prazos",
        href: "/prazos",
        icon: CalendarDays,
        permissions: ["deadline.read"],
      },
      {
        label: "Audiências",
        href: "/audiencias",
        icon: Gavel,
        permissions: ["hearing.read"],
      },
      {
        label: "Tarefas",
        href: "/tarefas",
        icon: CheckSquare,
        permissions: ["task.read"],
      },
      {
        label: "Checklists",
        href: "/checklists",
        icon: CheckSquare,
        permissions: ["document.read", "checklist.manage"],
      },
      {
        label: "Calendário Jurídico",
        href: "/calendario",
        icon: CalendarDays,
        permissions: ["calendar.read"],
      },
    ],
  },
  {
    label: "Financeiro",
    items: [
      {
        label: "Dashboard Financeiro",
        href: "/dashboard/financeiro",
        icon: LayoutDashboard,
        permissions: ["finance.read"],
      },
      {
        label: "Análises Financeiras",
        href: "/financeiro/analise",
        icon: BarChart3,
        permissions: ["finance.read"],
      },
      {
        label: "Contratos",
        href: "/financeiro/contratos",
        icon: CircleDollarSign,
        permissions: ["finance.read"],
      },
      {
        label: "Contas a Receber",
        href: "/financeiro/parcelas",
        icon: CircleDollarSign,
        permissions: ["finance.read"],
      },
      {
        label: "Inadimplência",
        href: "/financeiro/inadimplencia",
        icon: CircleDollarSign,
        permissions: ["finance.read"],
      },
      {
        label: "Comprovantes",
        href: "/financeiro/comprovantes",
        icon: CircleDollarSign,
        permissions: ["finance.read"],
      },
    ],
  },
  {
    label: "Gestão",
    items: [
      {
        label: "Dashboard Gerencial",
        href: "/dashboard/gestao",
        icon: LayoutDashboard,
        permissions: ["report.read", "audit.read"],
      },
      {
        label: "Indicadores e Relatórios",
        href: "/relatorios",
        icon: BarChart3,
        permissions: ["report.read"],
      },
      {
        label: "Histórico",
        href: "/historico",
        icon: History,
        permissions: ["audit.read"],
      },
    ],
  },
];

const routeLabels: Record<string, string> = {
  dashboard: "Dashboards",
  administracao: "Administração",
  secretaria: "Secretaria",
  juridico: "Jurídico",
  financeiro: "Financeiro",
  gestao: "Gestão",
  usuarios: "Usuários",
  perfis: "Perfis e Permissões",
  areas: "Departamentos e Áreas",
  filiais: "Empresas e Filiais",
  configuracoes: "Configurações",
  atendimentos: "Central de Entradas",
  clientes: "Clientes",
  processos: "Processos",
  prazos: "Prazos",
  audiencias: "Audiências",
  tarefas: "Tarefas",
  calendario: "Calendário",
  checklists: "Checklists",
  contratos: "Contratos",
  analise: "Análises",
  parcelas: "Contas a Receber",
  inadimplencia: "Inadimplência",
  comprovantes: "Comprovantes",
  relatorios: "Relatórios",
  historico: "Histórico",
};

function themeVariables(color: string): CSSProperties {
  const match = /^#([0-9a-f]{6})$/i.exec(color);
  if (!match) return {};
  const hex = match[1]!;
  const red = parseInt(hex.slice(0, 2), 16) / 255;
  const green = parseInt(hex.slice(2, 4), 16) / 255;
  const blue = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;
  const saturation =
    delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;
  if (delta) {
    if (max === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (max === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }
  if (hue < 0) hue += 360;
  return {
    "--primary": `${hue.toFixed(0)} ${(saturation * 100).toFixed(0)}% ${(lightness * 100).toFixed(0)}%`,
    "--ring": `${hue.toFixed(0)} ${(saturation * 100).toFixed(0)}% ${(lightness * 100).toFixed(0)}%`,
  } as CSSProperties;
}

export function AppShell({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider userId={user.userId}>
      <WorkspaceTabsProvider user={user}>
        <AppShellContent user={user}>{children}</AppShellContent>
      </WorkspaceTabsProvider>
    </ThemeProvider>
  );
}

function AppShellContent({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const storageKey = `lexora:sidebar:${user.userId}`;
  const sections = useMemo(
    () =>
      navigation
        .map((section) => ({
          ...section,
          items: section.items.filter((item) =>
            item.permissions.some((permission) =>
              user.permissions.includes(permission),
            ),
          ),
        }))
        .filter((section) => section.items.length),
    [user.permissions],
  );
  const breadcrumbs = pathname
    .split("/")
    .filter(Boolean)
    .map(
      (part) =>
        routeLabels[part] ??
        (/^[0-9a-f-]{20,}$/i.test(part)
          ? "Detalhe"
          : part.replaceAll("-", " ")),
    );

  useEffect(() => {
    setCollapsed(localStorage.getItem(storageKey) === "collapsed");
  }, [storageKey]);
  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      localStorage.setItem(storageKey, next ? "collapsed" : "expanded");
      return next;
    });
  }
  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const renderSidebar = (compact: boolean) => (
    <aside
      className={cn(
        "bg-telun-cosmico flex h-full flex-col border-r border-white/10 transition-[width] duration-200",
        compact ? "w-20" : "w-72",
      )}
    >
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-white/10",
          compact ? "justify-center px-2" : "px-6",
        )}
      >
        <BrandWordmark compact={compact} />
        {!compact && (
          <p
            className="ml-auto max-w-32 truncate text-[10px] text-slate-500"
            title={user.tenantName}
          >
            {user.tenantName}
          </p>
        )}
      </div>
      <nav
        className={cn("flex-1 overflow-y-auto py-4", compact ? "px-2" : "px-3")}
        aria-label="Navegação principal"
      >
        {sections.map((section) => (
          <div key={section.label} className="mb-5 last:mb-0">
            {!compact && (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={`${section.label}:${item.href}`}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    title={compact ? item.label : undefined}
                    aria-label={compact ? item.label : undefined}
                    className={cn(
                      "focus-visible:ring-primary flex min-h-10 items-center rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2",
                      compact ? "justify-center px-2" : "gap-3 px-3",
                      active
                        ? "bg-telun-violeta text-white shadow-[inset_2px_0_0_#A56FFF]"
                        : "text-slate-400 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!compact && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div
        className={cn(
          "shrink-0 border-t border-white/10 p-3",
          compact && "px-2",
        )}
      >
        {!compact && (
          <div className="mb-2 px-2">
            <p className="truncate text-sm font-medium text-white">
              {user.userName}
            </p>
            <p className="truncate text-xs text-slate-500">{user.userEmail}</p>
          </div>
        )}
        <div
          className={cn(
            "flex items-center",
            compact ? "flex-col gap-1" : "gap-1",
          )}
        >
          <Button
            variant="ghost"
            size={compact ? "icon" : "sm"}
            className={cn(
              "text-slate-400 hover:text-white",
              !compact && "flex-1 justify-start gap-2",
            )}
            onClick={signOut}
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
            {!compact && "Sair"}
          </Button>
          <ThemeToggle />
        </div>
        {!compact && (
          <p className="mt-2 px-2 text-[10px] tracking-wide text-slate-600">
            Lexora, um produto Telun.
          </p>
        )}
      </div>
    </aside>
  );

  return (
    <div
      className="bg-background min-h-screen min-w-0"
      style={themeVariables(user.primaryColor)}
    >
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">
        {renderSidebar(collapsed)}
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-black/70"
            aria-label="Fechar menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-72">
            {renderSidebar(false)}
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 text-white"
              aria-label="Fechar menu"
              onClick={() => setMobileOpen(false)}
            >
              <X />
            </Button>
          </div>
        </div>
      )}
      <header
        className={cn(
          "bg-background/95 sticky top-0 z-30 flex h-16 min-w-0 items-center border-b px-3 backdrop-blur transition-[margin] lg:px-5",
          collapsed ? "lg:ml-20" : "lg:ml-72",
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Abrir menu"
          onClick={() => setMobileOpen(true)}
        >
          <Menu />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:inline-flex"
          aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
          title={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
          onClick={toggleCollapsed}
        >
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
        </Button>
        <nav
          className="text-muted-foreground ml-2 flex min-w-0 items-center gap-1.5 overflow-hidden text-xs"
          aria-label="Breadcrumb"
        >
          <Link href="/dashboard" className="hover:text-foreground shrink-0">
            Lexora
          </Link>
          {breadcrumbs.map((item, index) => (
            <span
              key={`${item}:${index}`}
              className="flex min-w-0 items-center gap-1.5"
            >
              <ChevronRight className="h-3 w-3 shrink-0" />
              <span
                className={cn(
                  "truncate capitalize",
                  index === breadcrumbs.length - 1 && "text-foreground",
                )}
              >
                {item}
              </span>
            </span>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <GlobalSearch />
          <NotificationMenu />
          <span className="text-muted-foreground hidden max-w-56 truncate text-[10px] uppercase tracking-wide sm:block">
            {user.roles.map((role) => role.replaceAll("_", " ")).join(" · ")}
          </span>
        </div>
      </header>
      <div
        className={cn(
          "sticky top-16 z-20 min-w-0 transition-[margin]",
          collapsed ? "lg:ml-20" : "lg:ml-72",
        )}
      >
        <WorkspaceTabBar />
      </div>
      <main
        className={cn(
          "min-w-0 p-4 transition-[margin] lg:p-6 xl:p-8",
          collapsed ? "lg:ml-20" : "lg:ml-72",
        )}
      >
        {children}
      </main>
    </div>
  );
}
