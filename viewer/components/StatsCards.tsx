import { memo } from "react";
import type { JSX } from "react";
import { formatNum } from "@/lib/utils";

interface StatsCardsProps {
  stats: {
    departamental: { ok: number };
    provincial: { ok: number };
    distrital: { ok: number };
    capitales: { ok: number };
  };
}

function StatsCardsInner({ stats }: StatsCardsProps): JSX.Element {
  const cards = [
    { label: "Departamentos", value: stats.departamental.ok },
    { label: "Provincias", value: stats.provincial.ok },
    { label: "Distritos", value: stats.distrital.ok },
    { label: "Capitales", value: stats.capitales.ok },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {c.label}
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {formatNum(c.value)}
          </p>
        </div>
      ))}
    </div>
  );
}

export const StatsCards = memo(StatsCardsInner);
