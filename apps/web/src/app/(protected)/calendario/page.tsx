import Link from "next/link";
import { CreatePanel } from "@/components/create-panel";
import { DeadlineCalendar } from "@/components/deadline-calendar";
import { PageHeader } from "@/components/page-header";
import { SearchForm } from "@/components/search-form";
import { ModuleNav } from "@/features/shared/components/module-nav";
import { fetchData, type Lookups } from "@/lib/page-data";
import { getCurrentUser } from "@/lib/server-api";

interface CalendarList {
  items: Array<{
    id: string;
    source: string;
    type: string;
    title: string;
    startsAt: string;
    status: string;
    priority?: string;
    href: string;
  }>;
}
type Mode = "month" | "week" | "list";
function key(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{
    mode?: Mode;
    date?: string;
    branchId?: string;
    legalAreaId?: string;
    responsibleId?: string;
  }>;
}) {
  const query = await searchParams;
  const mode = query.mode ?? "month";
  const reference = query.date
    ? new Date(`${query.date}T12:00:00`)
    : new Date();
  const from =
    mode === "month"
      ? new Date(reference.getFullYear(), reference.getMonth(), 1)
      : new Date(reference);
  from.setDate(from.getDate() - from.getDay());
  const to = new Date(from);
  to.setDate(
    from.getDate() + (mode === "month" ? 42 : mode === "week" ? 7 : 31),
  );
  const apiParams = new URLSearchParams({
    pageSize: "100",
    from: from.toISOString(),
    to: to.toISOString(),
    branchId: query.branchId ?? "",
    legalAreaId: query.legalAreaId ?? "",
    responsibleId: query.responsibleId ?? "",
  });
  const [data, lookups, user] = await Promise.all([
    fetchData<CalendarList>(`/v1/calendar?${apiParams}`),
    fetchData<Lookups>("/v1/lookups"),
    getCurrentUser(),
  ]);
  const delta = mode === "month" ? 1 : mode === "week" ? 7 : 1;
  const previous = new Date(reference);
  const next = new Date(reference);
  if (mode === "month") {
    previous.setMonth(reference.getMonth() - 1);
    next.setMonth(reference.getMonth() + 1);
  } else {
    previous.setDate(reference.getDate() - delta);
    next.setDate(reference.getDate() + delta);
  }
  const link = (date: Date) =>
    `/calendario?${new URLSearchParams({ ...Object.fromEntries(Object.entries(query).filter((entry): entry is [string, string] => Boolean(entry[1]))), mode, date: key(date) })}`;
  const fields = [
    { name: "title", label: "Título", required: true },
    {
      name: "type",
      label: "Tipo",
      type: "select" as const,
      required: true,
      options: ["REUNIAO", "COMPROMISSO", "COBRANCA", "OUTRO"].map((x) => ({
        value: x,
        label: x,
      })),
    },
    {
      name: "startsAt",
      label: "Início",
      type: "datetime-local" as const,
      required: true,
    },
    { name: "endsAt", label: "Término", type: "datetime-local" as const },
    { name: "allDay", label: "Dia inteiro", type: "checkbox" as const },
    {
      name: "branchId",
      label: "Filial",
      type: "select" as const,
      options: lookups.branches.map((x) => ({ value: x.id, label: x.name })),
    },
    {
      name: "ownerUserId",
      label: "Responsável",
      type: "select" as const,
      options: lookups.users.map((x) => ({ value: x.id, label: x.name })),
    },
    { name: "location", label: "Local" },
    { name: "meetingLink", label: "Link" },
    { name: "description", label: "Descrição", type: "textarea" as const },
  ];
  const calendarItems = data.items.map((item) => ({
    id: item.id,
    title: item.title,
    type: item.type,
    dueAt: item.startsAt,
    color: item.status,
    client: { name: item.source },
  }));
  return (
    <>
      <PageHeader
        eyebrow={reference.toLocaleDateString("pt-BR", {
          month: "long",
          year: "numeric",
        })}
        title="Calendário unificado"
        description="Audiências, prazos, tarefas e compromissos em uma única agenda autorizada."
        action={
          <div className="flex flex-wrap gap-2">
            {user?.permissions.includes("calendar.create") && (
              <CreatePanel
                title="Novo compromisso"
                endpoint="/api/v1/calendar"
                buttonLabel="Novo compromisso"
                fields={fields}
              />
            )}
            <Link
              className="rounded-md border px-3 py-2 text-sm"
              href={link(previous)}
            >
              Anterior
            </Link>
            <Link
              className="rounded-md border px-3 py-2 text-sm"
              href={`/calendario?mode=${mode}`}
            >
              Hoje
            </Link>
            <Link
              className="rounded-md border px-3 py-2 text-sm"
              href={link(next)}
            >
              Próximo
            </Link>
          </div>
        }
      />
      <ModuleNav
        items={[
          { label: "Mês", href: "/calendario?mode=month" },
          { label: "Semana", href: "/calendario?mode=week" },
          { label: "Lista", href: "/calendario?mode=list" },
        ]}
      />
      <SearchForm>
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="date" value={key(reference)} />
        <select
          name="branchId"
          defaultValue={query.branchId}
          className="bg-background h-10 rounded-md border px-3 text-sm"
        >
          <option value="">Todas as filiais</option>
          {lookups.branches.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          name="legalAreaId"
          defaultValue={query.legalAreaId}
          className="bg-background h-10 rounded-md border px-3 text-sm"
        >
          <option value="">Todas as áreas</option>
          {lookups.legalAreas.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          name="responsibleId"
          defaultValue={query.responsibleId}
          className="bg-background h-10 rounded-md border px-3 text-sm"
        >
          <option value="">Todos os responsáveis</option>
          {lookups.users.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </SearchForm>
      <DeadlineCalendar
        items={calendarItems}
        mode={mode}
        referenceDate={key(reference)}
      />
    </>
  );
}
