"use client";

import { memo } from "react";
import type { JSX } from "react";
import { presentarNombre, type RegistroPublico } from "@/lib/domain/consulta";

interface ListaResultadosProps {
  resultados: RegistroPublico[];
  coincidencias: number;
  cargando: boolean;
  onElegir: (registro: RegistroPublico) => void;
}

function ListaResultadosInner({
  resultados,
  coincidencias,
  cargando,
  onElegir,
}: ListaResultadosProps): JSX.Element {
  return (
    <div>
      <p className="mb-2 text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
        {cargando ? "Buscando…" : `${coincidencias} coincidencias en /api/ubigeo`}
      </p>
      <ul className="max-h-48 space-y-1 overflow-auto">
        {resultados.map((registro) => (
          <li key={`${registro.nivel}-${registro.ubigeo}-${registro.nombre}`}>
            <button
              type="button"
              onClick={() => onElegir(registro)}
              className="flex w-full items-baseline justify-between gap-3 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:hover:bg-slate-800"
            >
              <span>{presentarNombre(registro.nombre)}</span>
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{registro.ubigeo}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const ListaResultados = memo(ListaResultadosInner);
