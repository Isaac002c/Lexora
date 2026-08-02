"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "./ui/button";

interface Notification {
  id: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  readAt?: string;
  createdAt: string;
}
function href(item: Notification) {
  if (item.entityType === "DEADLINE")
    return `/prazos?search=${encodeURIComponent(item.message)}`;
  if (item.entityType === "DEADLINE_REVIEW")
    return "/prazos?status=PENDING_APPROVAL";
  if (item.entityType === "HEARING")
    return `/audiencias?search=${encodeURIComponent(item.message)}`;
  if (item.entityType === "TASK")
    return `/tarefas?search=${encodeURIComponent(item.message)}`;
  if (item.entityType === "LEGAL_CASE" && item.entityId)
    return `/processos/${item.entityId}`;
  return "/dashboard";
}

export function NotificationMenu() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{ items: Notification[]; unread: number }>({
    items: [],
    unread: 0,
  });
  const load = useCallback(async () => {
    const response = await fetch("/api/v1/notifications");
    if (response.ok) setData((await response.json()) as typeof data);
  }, []);
  useEffect(() => {
    void load();
    const timer = window.setInterval(load, 60_000);
    return () => window.clearInterval(timer);
  }, [load]);
  async function read(item: Notification) {
    if (!item.readAt) {
      await fetch(`/api/v1/notifications/${item.id}/read`, { method: "PATCH" });
      setData((value) => ({
        unread: Math.max(0, value.unread - 1),
        items: value.items.map((x) =>
          x.id === item.id ? { ...x, readAt: new Date().toISOString() } : x,
        ),
      }));
    }
    setOpen(false);
  }
  async function readAll() {
    await fetch("/api/v1/notifications/read-all", { method: "POST" });
    setData((value) => ({
      unread: 0,
      items: value.items.map((x) => ({
        ...x,
        readAt: x.readAt ?? new Date().toISOString(),
      })),
    }));
  }
  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Notificações${data.unread ? `, ${data.unread} não lidas` : ""}`}
      >
        <Bell className="h-4 w-4" />
        {data.unread > 0 && (
          <span className="bg-warning absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white">
            {Math.min(data.unread, 99)}
          </span>
        )}
      </Button>
      {open && (
        <div className="bg-background absolute right-0 top-11 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-lg border shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-semibold">Notificações</p>
            <button
              className="text-primary text-xs hover:underline"
              onClick={readAll}
            >
              Marcar todas como lidas
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto p-2">
            {!data.items.length ? (
              <p className="text-muted-foreground p-6 text-center text-sm">
                Nenhuma notificação.
              </p>
            ) : (
              data.items.map((item) => (
                <Link
                  key={item.id}
                  href={href(item)}
                  onClick={() => void read(item)}
                  className={`hover:bg-muted block rounded-md px-3 py-2.5 ${item.readAt ? "opacity-65" : "bg-primary/5"}`}
                >
                  <span className="block text-sm font-medium">
                    {item.title}
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    {item.message}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
