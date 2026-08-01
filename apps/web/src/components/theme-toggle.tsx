"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";
import { useTheme, type ThemePreference } from "./theme-provider";

const nextTheme: Record<ThemePreference, ThemePreference> = { dark: "light", light: "system", system: "dark" };
const label: Record<ThemePreference, string> = { dark: "Tema escuro", light: "Tema claro", system: "Tema do sistema" };

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const Icon = preference === "dark" ? Moon : preference === "light" ? Sun : Laptop;
  return <Button type="button" variant="ghost" size="icon" title={`${label[preference]}. Alterar tema`} aria-label={`${label[preference]}. Alterar tema`} onClick={() => setPreference(nextTheme[preference])}><Icon className="h-4 w-4" /></Button>;
}

