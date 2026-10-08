/** Teselas servidas por la app, con peticiones Range (el protocolo PMTiles las exige). */
export const URL_PMTILES_LOCAL = "/pmtiles";

/**
 * Misma archivo en el CDN de jsDelivr, que responde Range sobre el árbol de GitHub.
 * El pin auditable del bytes está en data/v2023/MANIFEST.json (artefacto pmtiles).
 */
export const URL_PMTILES_CDN =
  "https://cdn.jsdelivr.net/gh/lincolneulogio/peru-geojson@master/data/variants/peru-ubigeo.pmtiles";
