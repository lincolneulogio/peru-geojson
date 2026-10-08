"use client";

import { memo } from "react";
import type { JSX } from "react";
import type { Nivel } from "@/lib/types";
import { cn } from "@/lib/utils";

const NIVELES: { id: Nivel; label: string }[] = [
  { id: "departamental", label: "Departamentos" },
  { id: "provincial", label: "Provincias" },
  { id: "distrital", label: "Distritos" },
  { id: "capitales", label: "Capitales" },
];

interface LevelTabsProps {
  nivel: Nivel;
  onChange: (n: Nivel) => void;
}

function LevelTabsInner({ nivel, onChange }: LevelTabsProps): JSX.Element {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Nivel geográfico">
      {NIVELES.map((n) => (
        <button
          key={n.id}
          role="tab"
          aria-selected={nivel === n.id}
          onClick={() => onChange(n.id)}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-medium transition",
            nivel === n.id
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
              : "border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800",
          )}
        >
          {n.label}
        </button>
      ))}
    </div>
  );
}

export const LevelTabs = memo(LevelTabsInner);
