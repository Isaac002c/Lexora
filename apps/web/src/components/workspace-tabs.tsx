"use client";

import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckSquare,
  CircleDollarSign,
  ClipboardList,
  Gavel,
  History,
  LayoutDashboard,
  LockKeyhole,
  Pin,
  PinOff,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  User,
  Users,
  X,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CurrentUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

type IconName =
  | "dashboard"
  | "clipboard"
  | "users"
  | "user"
  | "gavel"
  | "calendar"
  | "checklist"
  | "finance"
  | "building"
  | "history"
  | "settings"
  | "security"
  | "briefcase";

interface WorkspaceTab {
  key: string;
  title: string;
  route: string;
  icon: IconName;
  permission?: string[];
  pinned: boolean;
  dirty: boolean;
}

interface ClosedTab extends WorkspaceTab {
  closedAt: number;
}

interface WorkspaceTabsContextValue {
  setDirty: (dirty: boolean) => void;
  registerSaveHandler: (handler: () => Promise<boolean>) => () => void;
  bar: React.ReactNode;
}

const WorkspaceTabsContext = createContext<WorkspaceTabsContextValue | null>(
  null,
);

const iconMap = {
  dashboard: LayoutDashboard,
  clipboard: ClipboardList,
  users: Users,
  user: User,
  gavel: Gavel,
  calendar: CalendarDays,
  checklist: CheckSquare,
  finance: CircleDollarSign,
  building: Building2,
  history: History,
  settings: Settings,
  security: ShieldCheck,
  briefcase: BriefcaseBusiness,
} satisfies Record<IconName, typeof LayoutDashboard>;

const routeDefinitions: Array<{
  pattern: RegExp;
  key: (match: RegExpMatchArray) => string;
  title: string | ((match: RegExpMatchArray) => string);
  icon: IconName;
  permission?: string[];
}> = [
  {
    pattern: /^\/clientes\/([^/]+)$/,
    key: (match) => `cliente:${match[1]}`,
    title: "Cliente",
    icon: "user",
    permission: ["client.read"],
  },
  {
    pattern: /^\/processos\/([^/]+)$/,
    key: (match) => `processo:${match[1]}`,
    title: "Processo",
    icon: "gavel",
    permission: ["case.read"],
  },
  {
    pattern: /^\/atendimentos\/([^/]+)$/,
    key: (match) => `atendimento:${match[1]}`,
    title: "Atendimento",
    icon: "clipboard",
    permission: ["attendance.read"],
  },
  {
    pattern: /^\/financeiro\/contratos\/([^/]+)$/,
    key: (match) => `contrato:${match[1]}`,
    title: "Contrato",
    icon: "finance",
    permission: ["finance.read"],
  },
  {
    pattern: /^\/dashboard\/administracao$/,
    key: () => "dashboard:administracao",
    title: "Dashboard Administrativo",
    icon: "dashboard",
    permission: [
      "user.manage",
      "branch.manage",
      "legal_area.manage",
      "audit.read",
      "tenant.configure",
    ],
  },
  {
    pattern: /^\/dashboard\/secretaria$/,
    key: () => "dashboard:secretaria",
    title: "Dashboard da Secretaria",
    icon: "dashboard",
    permission: ["attendance.read"],
  },
  {
    pattern: /^\/dashboard\/juridico$/,
    key: () => "dashboard:juridico",
    title: "Dashboard Jurídico",
    icon: "dashboard",
    permission: ["case.read", "deadline.read"],
  },
  {
    pattern: /^\/dashboard\/financeiro$/,
    key: () => "dashboard:financeiro",
    title: "Dashboard Financeiro",
    icon: "dashboard",
    permission: ["finance.read"],
  },
  {
    pattern: /^\/dashboard\/gestao$/,
    key: () => "dashboard:gestao",
    title: "Dashboard Gerencial",
    icon: "dashboard",
    permission: ["report.read", "audit.read"],
  },
  {
    pattern: /^\/dashboard$/,
    key: () => "dashboard",
    title: "Dashboard",
    icon: "dashboard",
    permission: ["dashboard.read"],
  },
  {
    pattern: /^\/atendimentos$/,
    key: () => "atendimentos",
    title: "Central de Entradas",
    icon: "clipboard",
    permission: ["attendance.read"],
  },
  {
    pattern: /^\/clientes$/,
    key: () => "clientes",
    title: "Clientes",
    icon: "users",
    permission: ["client.read"],
  },
  {
    pattern: /^\/processos$/,
    key: () => "processos",
    title: "Processos",
    icon: "gavel",
    permission: ["case.read"],
  },
  {
    pattern: /^\/prazos$/,
    key: () => "prazos",
    title: "Prazos",
    icon: "calendar",
    permission: ["deadline.read"],
  },
  {
    pattern: /^\/audiencias$/,
    key: () => "audiencias",
    title: "Audiências",
    icon: "gavel",
    permission: ["hearing.read"],
  },
  {
    pattern: /^\/tarefas$/,
    key: () => "tarefas",
    title: "Tarefas",
    icon: "checklist",
    permission: ["task.read"],
  },
  {
    pattern: /^\/calendario$/,
    key: () => "calendario",
    title: "Calendário Jurídico",
    icon: "calendar",
    permission: ["calendar.read"],
  },
  {
    pattern: /^\/checklists/,
    key: () => "checklists",
    title: "Checklists",
    icon: "checklist",
    permission: ["document.read", "checklist.manage"],
  },
  {
    pattern: /^\/financeiro/,
    key: () => "financeiro",
    title: "Financeiro",
    icon: "finance",
    permission: ["finance.read"],
  },
  {
    pattern: /^\/relatorios$/,
    key: () => "relatorios",
    title: "Relatórios",
    icon: "briefcase",
    permission: ["report.read"],
  },
  {
    pattern: /^\/historico$/,
    key: () => "historico",
    title: "Histórico",
    icon: "history",
    permission: ["audit.read"],
  },
  {
    pattern: /^\/administracao\/usuarios$/,
    key: () => "usuarios",
    title: "Usuários",
    icon: "users",
    permission: ["user.manage"],
  },
  {
    pattern: /^\/administracao\/perfis$/,
    key: () => "perfis",
    title: "Perfis e Permissões",
    icon: "security",
    permission: ["user.manage"],
  },
  {
    pattern: /^\/administracao\/filiais$/,
    key: () => "filiais",
    title: "Empresas e Filiais",
    icon: "building",
    permission: ["branch.manage"],
  },
  {
    pattern: /^\/administracao\/areas$/,
    key: () => "areas",
    title: "Áreas Jurídicas",
    icon: "building",
    permission: ["legal_area.manage"],
  },
  {
    pattern: /^\/administracao\/seguranca$/,
    key: () => "seguranca",
    title: "Segurança",
    icon: "security",
    permission: ["user.manage"],
  },
  {
    pattern: /^\/(administracao\/)?configuracoes$/,
    key: () => "configuracoes",
    title: "Configurações",
    icon: "settings",
    permission: ["tenant.configure"],
  },
  {
    pattern: /^\/administracao$/,
    key: () => "administracao",
    title: "Administração",
    icon: "building",
    permission: [
      "user.manage",
      "branch.manage",
      "legal_area.manage",
      "audit.read",
      "tenant.configure",
    ],
  },
];

function resolveTab(pathname: string, route: string): WorkspaceTab {
  for (const definition of routeDefinitions) {
    const match = pathname.match(definition.pattern);
    if (match)
      return {
        key: definition.key(match),
        title:
          typeof definition.title === "function"
            ? definition.title(match)
            : definition.title,
        route,
        icon: definition.icon,
        permission: definition.permission,
        pinned: false,
        dirty: false,
      };
  }
  const title =
    pathname.split("/").filter(Boolean).at(-1)?.replaceAll("-", " ") ??
    "Lexora";
  return {
    key: pathname,
    title: title.charAt(0).toUpperCase() + title.slice(1),
    route,
    icon: "briefcase",
    pinned: false,
    dirty: false,
  };
}

function isAllowed(tab: WorkspaceTab, user: CurrentUser) {
  return (
    !tab.permission?.length ||
    tab.permission.some((permission) => user.permissions.includes(permission))
  );
}

type PendingAction =
  | { type: "navigate"; route: string; keys: string[] }
  | { type: "close"; keys: string[] };

export function WorkspaceTabsProvider({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const route = `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ""}`;
  const storageKey = `lexora:workspace:${user.userId}`;
  const [tabs, setTabs] = useState<WorkspaceTab[]>([]);
  const [closedTabs, setClosedTabs] = useState<ClosedTab[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [tabSearch, setTabSearch] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    key: string;
    x: number;
    y: number;
  } | null>(null);
  const [draggedKey, setDraggedKey] = useState<string>();
  const saveHandlers = useRef(new Map<string, () => Promise<boolean>>());
  const tabsRef = useRef<WorkspaceTab[]>([]);
  const activeKeyRef = useRef("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeTab =
    tabs.find((tab) => tab.route === route) ??
    tabs.find((tab) => tab.route.split("?")[0] === pathname);
  tabsRef.current = tabs;
  activeKeyRef.current = activeTab?.key ?? "";

  useEffect(() => {
    let restored: WorkspaceTab[] = [];
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}") as {
        tabs?: WorkspaceTab[];
        closedTabs?: ClosedTab[];
        scrollLeft?: number;
      };
      restored = (saved.tabs ?? [])
        .filter(
          (tab) =>
            tab.key !== "dashboard" &&
            tab.route?.startsWith("/") &&
            isAllowed(tab, user),
        )
        .map((tab) => ({ ...tab, dirty: false }));
      setClosedTabs(
        (saved.closedTabs ?? [])
          .filter((tab) => tab.key !== "dashboard" && isAllowed(tab, user))
          .slice(0, 20),
      );
      requestAnimationFrame(() => {
        if (scrollRef.current)
          scrollRef.current.scrollLeft = saved.scrollLeft ?? 0;
      });
    } catch {
      restored = [];
    }
    const current = resolveTab(pathname, route);
    const existing = restored.findIndex((tab) => tab.key === current.key);
    if (existing >= 0)
      restored[existing] = { ...restored[existing]!, route: current.route };
    else if (isAllowed(current, user)) restored.push(current);
    setTabs(restored);
    setHydrated(true);
    // The user-specific key is the only restoration boundary; route updates happen below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    const current = resolveTab(pathname, route);
    if (!isAllowed(current, user)) return;
    setTabs((existing) => {
      const index = existing.findIndex((tab) => tab.key === current.key);
      if (index < 0) return [...existing, current];
      const next = [...existing];
      next[index] = {
        ...next[index]!,
        title: current.title,
        route: current.route,
        icon: current.icon,
        permission: current.permission,
      };
      return next;
    });
  }, [hydrated, pathname, route, user]);

  const persist = useCallback(
    (nextTabs = tabsRef.current, nextClosed = closedTabs) => {
      if (!hydrated) return;
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          tabs: nextTabs.map((tab) => ({ ...tab, dirty: false })),
          closedTabs: nextClosed.slice(0, 20),
          scrollLeft: scrollRef.current?.scrollLeft ?? 0,
        }),
      );
    },
    [closedTabs, hydrated, storageKey],
  );

  useEffect(() => {
    persist(tabs, closedTabs);
  }, [tabs, closedTabs, persist]);

  const setDirty = useCallback((dirty: boolean) => {
    const key = activeKeyRef.current;
    if (!key) return;
    setTabs((existing) =>
      existing.map((tab) => (tab.key === key ? { ...tab, dirty } : tab)),
    );
  }, []);

  const registerSaveHandler = useCallback((handler: () => Promise<boolean>) => {
    const key = activeKeyRef.current;
    if (!key) return () => undefined;
    saveHandlers.current.set(key, handler);
    return () => {
      if (saveHandlers.current.get(key) === handler)
        saveHandlers.current.delete(key);
    };
  }, []);

  const performClose = useCallback(
    (keys: string[]) => {
      const keySet = new Set(keys);
      const currentTabs = tabsRef.current;
      const removed = currentTabs.filter(
        (tab) => keySet.has(tab.key) && !tab.pinned,
      );
      const remaining = currentTabs.filter(
        (tab) => !keySet.has(tab.key) || tab.pinned,
      );
      if (!removed.length) return;
      const nextClosed = [
        ...removed.map((tab) => ({
          ...tab,
          dirty: false,
          closedAt: Date.now(),
        })),
        ...closedTabs,
      ].slice(0, 20);
      setClosedTabs(nextClosed);
      setTabs(remaining);
      const activeRemoved = removed.some(
        (tab) => tab.key === activeKeyRef.current,
      );
      if (activeRemoved) {
        const removedIndex = currentTabs.findIndex(
          (tab) => tab.key === activeKeyRef.current,
        );
        const destination =
          remaining[
            Math.min(removedIndex, Math.max(0, remaining.length - 1))
          ] ?? remaining.at(-1);
        router.push(destination?.route ?? "/dashboard");
      }
    },
    [closedTabs, router],
  );

  const requestClose = useCallback(
    (keys: string[]) => {
      const closeable = tabsRef.current.filter(
        (tab) => keys.includes(tab.key) && !tab.pinned,
      );
      if (!closeable.length) return;
      if (closeable.some((tab) => tab.dirty))
        setPending({ type: "close", keys: closeable.map((tab) => tab.key) });
      else performClose(closeable.map((tab) => tab.key));
    },
    [performClose],
  );

  const reopenLast = useCallback(() => {
    const [last, ...rest] = closedTabs;
    if (!last || !isAllowed(last, user)) return;
    setClosedTabs(rest);
    setTabs((existing) =>
      existing.some((tab) => tab.key === last.key)
        ? existing
        : [...existing, { ...last, dirty: false }],
    );
    router.push(last.route);
  }, [closedTabs, router, user]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!tabsRef.current.some((tab) => tab.dirty)) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const interceptLinks = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.origin !== window.location.origin
      )
        return;
      const active = tabsRef.current.find(
        (tab) => tab.key === activeKeyRef.current,
      );
      if (
        !active?.dirty ||
        `${anchor.pathname}${anchor.search}` === active.route
      )
        return;
      event.preventDefault();
      setPending({
        type: "navigate",
        route: `${anchor.pathname}${anchor.search}`,
        keys: [active.key],
      });
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", interceptLinks, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", interceptLinks, true);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "t") {
        event.preventDefault();
        reopenLast();
        return;
      }
      if (event.ctrlKey && event.key.toLowerCase() === "w") {
        event.preventDefault();
        if (activeKeyRef.current) requestClose([activeKeyRef.current]);
        return;
      }
      if (event.ctrlKey && event.key === "Tab") {
        event.preventDefault();
        const currentTabs = tabsRef.current;
        const index = currentTabs.findIndex(
          (tab) => tab.key === activeKeyRef.current,
        );
        const delta = event.shiftKey ? -1 : 1;
        const next =
          currentTabs[
            (index + delta + currentTabs.length) % currentTabs.length
          ];
        if (next) router.push(next.route);
      }
      if (event.altKey && /^[1-9]$/.test(event.key)) {
        const tab = tabsRef.current[Number(event.key) - 1];
        if (tab) {
          event.preventDefault();
          router.push(tab.route);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [reopenLast, requestClose, router]);

  async function savePending() {
    if (!pending) return;
    for (const key of pending.keys) {
      const tab = tabsRef.current.find((item) => item.key === key);
      if (!tab?.dirty) continue;
      const handler = saveHandlers.current.get(key);
      if (!handler || !(await handler())) return;
    }
    const action = pending;
    setPending(null);
    if (action.type === "close") performClose(action.keys);
    else router.push(action.route);
  }

  function discardPending() {
    if (!pending) return;
    const action = pending;
    setTabs((existing) =>
      existing.map((tab) =>
        action.keys.includes(tab.key) ? { ...tab, dirty: false } : tab,
      ),
    );
    setPending(null);
    if (action.type === "close") performClose(action.keys);
    else router.push(action.route);
  }

  function reorder(targetKey: string) {
    if (!draggedKey || draggedKey === targetKey) return;
    setTabs((existing) => {
      const source = existing.findIndex((tab) => tab.key === draggedKey);
      const target = existing.findIndex((tab) => tab.key === targetKey);
      if (source < 0 || target < 0) return existing;
      const next = [...existing];
      const [moved] = next.splice(source, 1);
      if (moved) next.splice(target, 0, moved);
      return next;
    });
    setDraggedKey(undefined);
  }

  const contextTab = contextMenu
    ? tabs.find((tab) => tab.key === contextMenu.key)
    : undefined;
  const contextIndex = contextTab
    ? tabs.findIndex((tab) => tab.key === contextTab.key)
    : -1;
  const filteredTabs = useMemo(
    () =>
      tabs.filter((tab) =>
        `${tab.title} ${tab.route}`
          .toLowerCase()
          .includes(tabSearch.toLowerCase()),
      ),
    [tabSearch, tabs],
  );
  function activate(tab: WorkspaceTab) {
    if (tab.key === activeKeyRef.current) return;
    const current = tabsRef.current.find(
      (item) => item.key === activeKeyRef.current,
    );
    if (current?.dirty)
      setPending({ type: "navigate", route: tab.route, keys: [current.key] });
    else router.push(tab.route);
  }

  const bar = (
    <div
      className="bg-background/95 flex h-10 min-w-0 items-stretch border-b"
      aria-label="Abas abertas"
    >
      <div
        ref={scrollRef}
        className="flex min-w-0 flex-1 items-stretch overflow-x-auto [scrollbar-width:thin]"
        role="tablist"
        onScroll={() => persist()}
      >
        {tabs.map((item) => {
          const Icon = iconMap[item.icon];
          const active = item.key === activeTab?.key;
          return (
            <div
              key={item.key}
              draggable
              onDragStart={() => setDraggedKey(item.key)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => reorder(item.key)}
              onContextMenu={(event) => {
                event.preventDefault();
                setContextMenu({
                  key: item.key,
                  x: event.clientX,
                  y: event.clientY,
                });
              }}
              className={cn(
                "border-border/70 group flex min-w-36 max-w-56 shrink-0 items-center border-r text-xs transition-colors",
                active
                  ? "bg-card text-foreground shadow-[inset_0_-2px_0_hsl(var(--primary))]"
                  : "bg-muted/20 text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
              role="presentation"
            >
              <button
                type="button"
                role="tab"
                aria-selected={active}
                title={`${item.title} · ${item.route}`}
                className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left"
                onClick={() => activate(item)}
              >
                {item.pinned ? (
                  <Pin className="text-primary h-3.5 w-3.5 shrink-0" />
                ) : (
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="truncate">{item.title}</span>
                {item.dirty && (
                  <span
                    className="bg-warning h-1.5 w-1.5 shrink-0 rounded-full"
                    aria-label="Alterações não salvas"
                  />
                )}
              </button>
              {!item.pinned && (
                <button
                  type="button"
                  aria-label={`Fechar ${item.title}`}
                  title={`Fechar ${item.title}`}
                  className="hover:bg-muted mr-1 grid h-7 w-7 shrink-0 place-items-center rounded opacity-60 hover:opacity-100 focus:opacity-100"
                  onClick={() => requestClose([item.key])}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="bg-background flex shrink-0 items-center border-l px-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Pesquisar abas"
          title="Pesquisar abas (atalhos: Ctrl+Tab, Alt+1…9)"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Reabrir última aba fechada"
          title="Reabrir última aba fechada (Ctrl+Shift+T)"
          disabled={!closedTabs.length}
          onClick={reopenLast}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
  const value = { setDirty, registerSaveHandler, bar };

  return (
    <WorkspaceTabsContext.Provider value={value}>
      {children}
      <div
        className="fixed inset-x-0 bottom-0 z-[60] hidden"
        aria-hidden="true"
      />
      {pending && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Alterações não salvas"
        >
          <div className="bg-card w-full max-w-md rounded-lg border p-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="bg-warning/10 text-warning grid h-10 w-10 place-items-center rounded-md">
                <LockKeyhole className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold">Alterações não salvas</h2>
                <p className="text-muted-foreground text-sm">
                  Salve ou descarte as alterações antes de continuar.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setPending(null)}>
                Cancelar
              </Button>
              <Button variant="outline" onClick={discardPending}>
                Descartar
              </Button>
              <Button
                onClick={() => void savePending()}
                disabled={pending.keys.some(
                  (key) =>
                    tabsRef.current.find((tab) => tab.key === key)?.dirty &&
                    !saveHandlers.current.has(key),
                )}
              >
                Salvar e continuar
              </Button>
            </div>
          </div>
        </div>
      )}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[90] grid place-items-start bg-black/60 px-4 pt-[12vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Pesquisar abas"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSearchOpen(false);
          }}
        >
          <div className="bg-card w-full max-w-xl rounded-lg border p-3 shadow-2xl">
            <div className="relative">
              <Search className="text-muted-foreground absolute left-3 top-3 h-4 w-4" />
              <Input
                autoFocus
                value={tabSearch}
                onChange={(event) => setTabSearch(event.target.value)}
                placeholder="Pesquisar abas abertas..."
                className="pl-9"
              />
            </div>
            <div className="mt-2 max-h-72 overflow-y-auto">
              {filteredTabs.map((item) => {
                const Icon = iconMap[item.icon];
                return (
                  <button
                    key={item.key}
                    type="button"
                    className="hover:bg-muted flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm"
                    onClick={() => {
                      router.push(item.route);
                      setSearchOpen(false);
                    }}
                  >
                    <Icon className="text-primary h-4 w-4" />
                    <span className="flex-1 truncate">{item.title}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {item.route}
                    </span>
                  </button>
                );
              })}
              {!filteredTabs.length && (
                <p className="text-muted-foreground p-5 text-center text-sm">
                  Nenhuma aba encontrada.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      {contextMenu && contextTab && (
        <div
          className="bg-card fixed z-[110] min-w-48 rounded-md border p-1 text-sm shadow-xl"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 210),
            top: Math.min(contextMenu.y, window.innerHeight - 260),
          }}
          role="menu"
          onMouseLeave={() => setContextMenu(null)}
        >
          <button
            type="button"
            className="hover:bg-muted flex w-full items-center gap-2 rounded px-3 py-2"
            onClick={() => {
              setTabs((existing) =>
                existing.map((tab) =>
                  tab.key === contextTab.key
                    ? { ...tab, pinned: !tab.pinned }
                    : tab,
                ),
              );
              setContextMenu(null);
            }}
          >
            {contextTab.pinned ? (
              <PinOff className="h-4 w-4" />
            ) : (
              <Pin className="h-4 w-4" />
            )}
            {contextTab.pinned ? "Desafixar" : "Fixar"}
          </button>
          <button
            type="button"
            className="hover:bg-muted flex w-full items-center gap-2 rounded px-3 py-2 disabled:opacity-50"
            disabled={contextTab.pinned}
            onClick={() => {
              requestClose([contextTab.key]);
              setContextMenu(null);
            }}
          >
            <X className="h-4 w-4" />
            Fechar
          </button>
          <button
            type="button"
            className="hover:bg-muted w-full rounded px-3 py-2 text-left"
            onClick={() => {
              requestClose(
                tabs
                  .filter((tab) => tab.key !== contextTab.key && !tab.pinned)
                  .map((tab) => tab.key),
              );
              setContextMenu(null);
            }}
          >
            Fechar outras
          </button>
          <button
            type="button"
            className="hover:bg-muted w-full rounded px-3 py-2 text-left"
            onClick={() => {
              requestClose(
                tabs
                  .slice(contextIndex + 1)
                  .filter((tab) => !tab.pinned)
                  .map((tab) => tab.key),
              );
              setContextMenu(null);
            }}
          >
            Fechar à direita
          </button>
          <button
            type="button"
            className="hover:bg-muted w-full rounded px-3 py-2 text-left"
            onClick={() => {
              requestClose(
                tabs.filter((tab) => !tab.pinned).map((tab) => tab.key),
              );
              setContextMenu(null);
            }}
          >
            Fechar não fixadas
          </button>
        </div>
      )}
    </WorkspaceTabsContext.Provider>
  );
}

export function WorkspaceTabBar() {
  const context = useContext(WorkspaceTabsContext);
  if (!context)
    throw new Error(
      "WorkspaceTabBar must be used inside WorkspaceTabsProvider",
    );
  return context.bar;
}

export function useWorkspaceTabs() {
  const value = useContext(WorkspaceTabsContext);
  if (!value)
    throw new Error(
      "useWorkspaceTabs must be used inside WorkspaceTabsProvider",
    );
  return value;
}
