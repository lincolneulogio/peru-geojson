"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useMemo } from "react";
import type { JSX } from "react";
import { LevelTabs } from "@/components/LevelTabs";
import { ListaResultados } from "@/components/ListaResultados";
import { SearchUbigeo } from "@/components/SearchUbigeo";
import { useConsultaUbigeo } from "@/hooks/useConsultaUbigeo";
import { useGeoExplorer } from "@/hooks/useGeoExplorer";
import type { RegistroPublico } from "@/lib/domain/consulta";
import type { Nivel } from "@/lib/types";

const MapView = dynamic(() => import("@/components/MapView").then((m) => m.MapView), {
  ssr: false,
  loading: () => (
    <div className="flex h-[min(62dvh,720px)] min-h-[320px] items-center justify-center rounded-2xl border border-slate-200 text-sm text-slate-500 dark:border-slate-800">
      Cargando mapa…
    </div>
  ),
});

interface GeoExplorerProps {
  depOptions: { value: string; label: string }[];
  provOptions: { value: string; label: string; dep: string }[];
  counts: Record<string, number>;
}

function padreDe(nivel: Nivel, dep: string | null, prov: string | null): string | undefined {
  if (nivel === "provincial") return dep ?? undefined;
  if (nivel === "distrital") return prov ?? dep ?? undefined;
  return undefined;
}

function nivelDeRegistro(nivel: RegistroPublico["nivel"]): Nivel {
  switch (nivel) {
    case "departamento":
      return "departamental";
    case "provincia":
      return "provincial";
    case "distrito":
      return "distrital";
    case "capital":
      return "capitales";
  }
}

export function GeoExplorer({ depOptions, provOptions, counts }: GeoExplorerProps): JSX.Element {
  const { theme } = useTheme();
  const state = useGeoExplorer({ depOptions, provOptions });
  const { nivel, setNivel, query, setQuery, sel, onDepChange, onProvChange, provFiltradas } = state;
  const consulta = useConsultaUbigeo({
    nivel,
    q: query,
    padre: padreDe(nivel, sel.dep, sel.prov),
  });
  const total = useMemo(() => counts[nivel] ?? consulta.coincidencias, [counts, nivel, consulta.coincidencias]);

  function elegir(registro: RegistroPublico): void {
    setNivel(nivelDeRegistro(registro.nivel));
    setQuery(registro.ubigeo);
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[380px_1fr]">
      <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <LevelTabs nivel={nivel} onChange={setNivel} />
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Departamento
          </span>
          <select
            value={sel.dep ?? ""}
            onChange={(e) => onDepChange(e.target.value || null)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="">Todos</option>
            {depOptions.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Provincia
          </span>
          <select
            value={sel.prov ?? ""}
            onChange={(e) => onProvChange(e.target.value || null)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="">Todas</option>
            {provFiltradas.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <SearchUbigeo query={query} onQuery={setQuery} total={total} />
        <ListaResultados
          resultados={consulta.resultados}
          coincidencias={consulta.coincidencias}
          cargando={consulta.cargando}
          onElegir={elegir}
        />
        <div className="space-y-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          <p>
            Datos IDE-INEI (2023) y capitales IDEP-2016. Licencia{" "}
            <a className="underline" href="https://creativecommons.org/licenses/by/4.0/">
              CC BY 4.0
            </a>
            . Atribución: INEI.
          </p>
          <p className="flex flex-wrap gap-x-3 gap-y-1">
            <a className="underline" href="/descargas/distritos.geojson">
              Light
            </a>
            <a className="underline" href="/descargas/peru.topojson">
              TopoJSON
            </a>
            <a className="underline" href="/descargas/peru-ubigeo.pmtiles">
              PMTiles
            </a>
            <a className="underline" href="/api/ubigeo?nivel=departamento&limite=25">
              API
            </a>
          </p>
        </div>
      </aside>
      <MapView nivel={nivel} dark={theme === "dark"} dep={sel.dep} prov={sel.prov} q={consulta.qDebounced} />
    </section>
  );
}
