import type { AnyFeature, Nivel } from "./types.js";
import { normalizarTexto } from "./ubigeo.js";

export interface FiltroGeo {
  /** Ubigeo de departamento (2 dígitos): filtra por prefijo. */
  dep?: string | null;
  /** Ubigeo de provincia (4 dígitos). Solo aplica a distrital. */
  prov?: string | null;
  /** Texto libre: nombre o fragmento de ubigeo. */
  q?: string | null;
  nivel: Nivel;
}

function propsDe(f: AnyFeature): Record<string, unknown> {
  return (f.properties ?? {}) as unknown as Record<string, unknown>;
}

function textoBuscable(f: AnyFeature): string {
  const p = propsDe(f);
  const partes = [p["ubigeo"], p["nombre_departamento"], p["nombre_provincia"], p["nombre_distrito"], p["capital"]].filter(
    (v): v is string => typeof v === "string",
  );
  return normalizarTexto(partes.join(" "));
}

/**
 * Filtra features en memoria por departamento/provincia + búsqueda.
 * Función pura: no muta el array de entrada.
 */
export function filtrarFeatures(features: AnyFeature[], filtro: FiltroGeo): AnyFeature[] {
  const q = normalizarTexto(filtro.q ?? "");
  return features.filter((f) => {
    const p = propsDe(f);
    const ub = typeof p["ubigeo"] === "string" ? p["ubigeo"] : "";
    if (filtro.dep != null && filtro.dep !== "") {
      if (!ub.startsWith(filtro.dep)) return false;
    }
    if (filtro.nivel === "distrital" && filtro.prov != null && filtro.prov !== "") {
      if (!ub.startsWith(filtro.prov)) return false;
    }
    if (q !== "") {
      if (!textoBuscable(f).includes(q)) return false;
    }
    return true;
  });
}

/** Atajo: solo búsqueda por texto, sin filtro geográfico. */
export function buscarPorNombre(features: AnyFeature[], query: string, nivel: Nivel): AnyFeature[] {
  return filtrarFeatures(features, { nivel, q: query });
}
