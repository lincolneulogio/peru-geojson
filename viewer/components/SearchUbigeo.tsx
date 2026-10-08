"use client";

import { memo } from "react";
import type { JSX } from "react";

interface SearchUbigeoProps {
  query: string;
  onQuery: (q: string) => void;
  total: number;
}

function SearchUbigeoInner({ query, onQuery, total }: SearchUbigeoProps): JSX.Element {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Buscar por nombre o ubigeo ({total} resultados)
      </span>
      <input
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Ej. 150137, Santa Anita, Cusco…"
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-slate-500"
      />
    </label>
  );
}

export const SearchUbigeo = memo(SearchUbigeoInner);
