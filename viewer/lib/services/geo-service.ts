import {
  filtrarFeatures,
  loadNivel,
  loadStats,
} from "peru-geojson";
import type { Nivel } from "peru-geojson";

/**
 * Adaptador del visor: API estable para las páginas/APIs Next.js.
 * La lógica real (filtrado, búsqueda, ubigeo) vive en la librería
 * `peru-geojson` — aquí no se duplica, solo se adapta.
 */
export const geoService = {
  async getStats(): Promise<unknown> {
    return loadStats();
  },

  async getLevel(nivel: Nivel): Promise<GeoJSON.FeatureCollection> {
    return loadNivel(nivel);
  },

  search(
    features: GeoJSON.Feature[],
    query: string,
    nivel: Nivel,
  ): GeoJSON.Feature[] {
    return filtrarFeatures(
      features as never,
      { nivel, q: query },
    ) as unknown as GeoJSON.Feature[];
  },

  filterBySeleccion(
    features: GeoJSON.Feature[],
    nivel: Nivel,
    dep: string | null,
    prov: string | null,
  ): GeoJSON.Feature[] {
    return filtrarFeatures(
      features as never,
      { nivel, dep, prov },
    ) as unknown as GeoJSON.Feature[];
  },
};
