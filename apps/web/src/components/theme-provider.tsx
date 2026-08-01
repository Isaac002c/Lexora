"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemePreference = "dark" | "light" | "system";

interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: "dark" | "light";
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isTheme(value: string | null): value is ThemePreference {
  return value === "dark" || value === "light" || value === "system";
}

function systemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const storageKey = `lexora:theme:${userId}`;
  const [preference, setPreferenceState] = useState<ThemePreference>("dark");
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("dark");

  const applyTheme = useCallback((next: ThemePreference) => {
    const resolved = next === "system" ? systemTheme() : next;
    document.documentElement.classList.toggle("dark", resolved === "dark");
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
    setResolvedTheme(resolved);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey) ?? localStorage.getItem("lexora:theme:global");
    const next = isTheme(stored) ? stored : "dark";
    setPreferenceState(next);
    applyTheme(next);
  }, [applyTheme, storageKey]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => { if (preference === "system") applyTheme("system"); };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [applyTheme, preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    localStorage.setItem(storageKey, next);
    localStorage.setItem("lexora:theme:global", next);
    applyTheme(next);
  }, [applyTheme, storageKey]);

  const value = useMemo(() => ({ preference, resolvedTheme, setPreference }), [preference, resolvedTheme, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}

