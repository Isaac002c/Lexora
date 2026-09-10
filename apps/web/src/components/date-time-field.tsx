"use client";

import { CalendarDays, Clock3 } from "lucide-react";
import { useState } from "react";
import { parseDateInput } from "@/lib/date";

function splitDateTime(value?: string) {
  const match = value?.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return {
    date: match?.[1] ?? "",
    time: match?.[2] ?? "",
  };
}

export function DateTimeField({
  name,
  label,
  required,
  defaultValue,
}: {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string;
}) {
  const initial = splitDateTime(defaultValue);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const value = date && time ? `${date}T${time}` : "";

  return (
    <div
      className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-2"
      role="group"
      aria-label={label}
    >
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs font-medium">Data</span>
        <div className="relative">
          <CalendarDays
            className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            id={name}
            type="date"
            value={date}
            required={required || Boolean(time)}
            aria-label={`${label}: data`}
            onChange={(event) => setDate(event.target.value)}
            onPaste={(event) => {
              const iso = parseDateInput(event.clipboardData.getData("text"));
              if (iso) {
                event.preventDefault();
                setDate(iso);
              }
            }}
            className="border-input bg-background h-10 w-full rounded-md border pl-9 pr-2 text-sm"
          />
        </div>
      </div>
      <div className="space-y-1">
        <span className="text-muted-foreground text-xs font-medium">
          Horário
        </span>
        <div className="relative">
          <Clock3
            className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            id={`${name}-time`}
            type="time"
            value={time}
            step={300}
            required={required || Boolean(date)}
            aria-label={`${label}: horário`}
            onChange={(event) => setTime(event.target.value)}
            className="border-input bg-background h-10 w-full rounded-md border pl-9 pr-2 text-sm"
          />
        </div>
      </div>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
