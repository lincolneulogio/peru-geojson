"use client";

import { useMemo, useState } from "react";
import type { Nivel, Seleccion } from "@/lib/types";

interface UseGeoExplorerOptions {
  depOptions: { value: string; label: string }[];
  provOptions: { value: string; label: string; dep: string }[];
}

/** Hook separado: estado y derivados fuera del JSX. */
export function useGeoExplorer({ depOptions, provOptions }: UseGeoExplorerOptions) {
  const [nivel, setNivel] = useState<Nivel>("departamental");
  const [query, setQuery] = useState<string>("");
  const [sel, setSel] = useState<Seleccion>({ dep: null, prov: null });

  const provFiltradas = useMemo(
    () => provOptions.filter((p) => !sel.dep || p.dep === sel.dep),
    [provOptions, sel.dep],
  );

  function onDepChange(dep: string | null): void {
    setSel({ dep, prov: null });
    if (dep) setNivel((n) => (n === "departamental" ? "provincial" : n));
  }

  function onProvChange(prov: string | null): void {
    setSel((s) => ({ ...s, prov }));
    if (prov) setNivel("distrital");
  }

  return { nivel, setNivel, query, setQuery, sel, onDepChange, onProvChange, provFiltradas, depOptions };
}

export type GeoExplorerState = ReturnType<typeof useGeoExplorer>;
