import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { IndiceUbigeo } from "./contrato.js";
import type {
  CapitalFeature,
  DepartamentoFeature,
  DistritoFeature,
  Nivel,
  ProvinciaFeature,
  Stats,
} from "./types.js";

export type { IndiceUbigeo as UbigeoIndex };

function dataDir(): string {
  // dist/*.js → ../data ; src/*.ts (dev) → ../data
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "data");
}

async function readJson<T>(file: string): Promise<T> {
  const raw = await fs.readFile(path.join(dataDir(), file), "utf-8");
  return JSON.parse(raw) as T;
}

const FILES: Record<Nivel, string> = {
  departamental: "peru-departamental.min.geojson",
  provincial: "peru-provincial.min.geojson",
  distrital: "peru-distrital.min.geojson",
  capitales: "peru-capitales.min.geojson",
};

export type DepartamentalFC = GeoJSON.FeatureCollection<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  DepartamentoFeature["properties"]
>;
export type ProvincialFC = GeoJSON.FeatureCollection<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  ProvinciaFeature["properties"]
>;
export type DistritalFC = GeoJSON.FeatureCollection<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  DistritoFeature["properties"]
>;
export type CapitalesFC = GeoJSON.FeatureCollection<GeoJSON.Point, CapitalFeature["properties"]>;

/** Carga la versión liviana incluida en el paquete. */
export function loadDepartamental(): Promise<DepartamentalFC> {
  return readJson<DepartamentalFC>(FILES.departamental);
}

export function loadProvincial(): Promise<ProvincialFC> {
  return readJson<ProvincialFC>(FILES.provincial);
}

export function loadDistrital(): Promise<DistritalFC> {
  return readJson<DistritalFC>(FILES.distrital);
}

export function loadCapitales(): Promise<CapitalesFC> {
  return readJson<CapitalesFC>(FILES.capitales);
}

export function loadUbigeoIndex(): Promise<IndiceUbigeo> {
  return readJson<IndiceUbigeo>("ubigeo.json");
}

/** Conteos derivados del índice + capitales (fuente única, sin STATS duplicado). */
export async function loadStats(): Promise<Stats> {
  const [indice, capitales] = await Promise.all([loadUbigeoIndex(), loadCapitales()]);
  return {
    departamental: { ok: indice.departamentos.length },
    provincial: { ok: indice.provincias.length },
    distrital: { ok: indice.distritos.length },
    capitales: { ok: capitales.features.length },
  };
}

const LOADERS: Record<Nivel, () => Promise<GeoJSON.FeatureCollection>> = {
  departamental: loadDepartamental,
  provincial: loadProvincial,
  distrital: loadDistrital,
  capitales: loadCapitales,
};

/** Carga genérica por nivel. Útil para visores y APIs. */
export function loadNivel(nivel: Nivel): Promise<GeoJSON.FeatureCollection> {
  return LOADERS[nivel]();
}
