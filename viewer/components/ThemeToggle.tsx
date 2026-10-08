"use client";

import { useTheme } from "next-themes";
import { memo } from "react";
import type { JSX } from "react";

function ThemeToggleInner(): JSX.Element {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Cambiar tema"
      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      {isDark ? "☀️ Claro" : "🌙 Oscuro"}
    </button>
  );
}

export const ThemeToggle = memo(ThemeToggleInner);
