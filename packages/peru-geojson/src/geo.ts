import type { AnyFeature } from "./types.js";

export interface Punto {
  lng: number;
  lat: number;
}

export interface ResultadoInverso {
  ubigeo: string;
  nivel: "departamental" | "provincial" | "distrital";
  properties: AnyFeature["properties"];
  /** true = el punto cae dentro; false = es el más cercano (fallback). */
  exacto: boolean;
}

type Anillo = number[][];

function bboxDe(coords: unknown): [number, number, number, number] | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const walk = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === "number" && typeof c[1] === "number") {
      minX = Math.min(minX, c[0]);
      minY = Math.min(minY, c[1]);
      maxX = Math.max(maxX, c[0]);
      maxY = Math.max(maxY, c[1]);
      return;
    }
    if (Array.isArray(c)) for (const v of c) walk(v);
  };
  walk(coords);
  return Number.isFinite(minX) ? [minX, minY, maxX, maxY] : null;
}

/** Ray casting sobre un anillo. Frontera = dentro. */
export function puntoEnAnillo(anillo: Anillo, p: Punto): boolean {
  let dentro = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const xi = anillo[i][0];
    const yi = anillo[i][1];
    const xj = anillo[j][0];
    const yj = anillo[j][1];
    if (yi === p.lat && xi === p.lng) return true;
    if (yj === p.lat && xj === p.lng) return true;
    if (yi > p.lat !== yj > p.lat && p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi) {
      dentro = !dentro;
    }
  }
  return dentro;
}

/** Dentro del exterior y fuera de todos los huecos. */
export function puntoEnPoligono(
  geom: GeoJSON.Polygon | GeoJSON.MultiPolygon,
  p: Punto,
): boolean {
  const polys = geom.type === "MultiPolygon" ? geom.coordinates : [geom.coordinates];
  return polys.some((poly) => {
    const [exterior, ...huecos] = poly as Anillo[];
    if (!puntoEnAnillo(exterior, p)) return false;
    return !huecos.some((h) => puntoEnAnillo(h, p));
  });
}

function propsDe(f: AnyFeature): Record<string, unknown> {
  return (f.properties ?? {}) as unknown as Record<string, unknown>;
}

function nivelDe(ubigeo: string): ResultadoInverso["nivel"] {
  if (ubigeo.length <= 2) return "departamental";
  if (ubigeo.length <= 4) return "provincial";
  return "distrital";
}

/**
 * Geocodificación inversa: punto → ubigeo del distrito que lo contiene.
 * Grueso-a-fino con bbox (del feature o calculada). Sin dependencias.
 * Con `fallback: "mas-cercano"` retorna el centroide más próximo si no hay
 * contención (útil en mar/frontera); si no, retorna null. Requiere tabla
 * de `loadIndicadoresGeo()` para el fallback.
 */
export function reverseGeocode(
  features: AnyFeature[],
  punto: Punto,
  opciones?: {
    fallback?: "mas-cercano" | null;
    centroides?: Record<string, [number, number]>;
  },
): ResultadoInverso | null {
  const fallback = opciones?.fallback ?? null;
  for (const f of features) {
    const g = f.geometry;
    if (!g || (g.type !== "Polygon" && g.type !== "MultiPolygon")) continue;
    const bb = (f.bbox as [number, number, number, number] | undefined) ?? bboxDe(g.coordinates);
    if (bb && (punto.lng < bb[0] || punto.lng > bb[2] || punto.lat < bb[1] || punto.lat > bb[3])) {
      continue;
    }
    if (puntoEnPoligono(g, punto)) {
      const ub = String(propsDe(f)["ubigeo"] ?? "");
      return { ubigeo: ub, nivel: nivelDe(ub), properties: f.properties, exacto: true };
    }
  }
  if (fallback === "mas-cercano" && opciones?.centroides) {
    let mejor: string | null = null;
    let mejorD = Infinity;
    for (const [ub, [x, y]] of Object.entries(opciones.centroides)) {
      const d = (x - punto.lng) ** 2 + (y - punto.lat) ** 2;
      if (d < mejorD) {
        mejorD = d;
        mejor = ub;
      }
    }
    if (mejor) {
      const f = features.find((x) => String(propsDe(x)["ubigeo"]) === mejor);
      return {
        ubigeo: mejor,
        nivel: nivelDe(mejor),
        properties: (f?.properties ?? {}) as AnyFeature["properties"],
        exacto: false,
      };
    }
  }
  return null;
}
