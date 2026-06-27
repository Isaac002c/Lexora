"use client";

import { useRef } from "react";
import { parseDateInput } from "@/lib/date";

// #1 — Campo de data: seletor visual nativo + colar dd/mm/aaaa ou ddmmaaaa.
// Submete sempre "yyyy-mm-dd" (data pura), interpretada no backend no fuso de SP.
export function DateField({
  name,
  id,
  required,
  defaultValue,
}: {
  name: string;
  id?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <input
      ref={ref}
      id={id ?? name}
      name={name}
      type="date"
      required={required}
      defaultValue={defaultValue ? defaultValue.slice(0, 10) : undefined}
      onPaste={(event) => {
        const iso = parseDateInput(event.clipboardData.getData("text"));
        if (iso && ref.current) {
          event.preventDefault();
          ref.current.value = iso;
        }
      }}
      className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
    />
  );
}
