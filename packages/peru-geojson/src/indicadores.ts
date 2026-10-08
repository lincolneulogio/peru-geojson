import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AnyFeature } from "./types.js";

/** Un distrito puede no tener dato: el join es LEFT, nunca inventa. */
export interface IndicadorSociodemografico {
  poblacion: number;
  hogares: number;
  pobreza_pct?: number;
  idh?: number;
  anio?: number;
  fuente?: string;
  sintetico?: boolean;
}

export interface IndicadorGeometrico {
  area_km2: number;
  centroide: [number, number];
  n_vertices: number;
}

export type EstadoIndicadores = "pendiente-oficial" | "oficial" | "demo-sintetico";

export interface TablaIndicadores {
  meta: { estado: EstadoIndicadores; [k: string]: unknown };
  registros: Record<string, IndicadorSociodemografico>;
}

export interface TablaGeometria {
  meta: { estado: string; [k: string]: unknown };
  niveles: Record<string, Record<string, IndicadorGeometrico>>;
}

function dataDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "data");
}

async function readJson<T>(file: string): Promise<T> {
  const raw = await fs.readFile(path.join(dataDir(), file), "utf-8");
  return JSON.parse(raw) as T;
}

export function loadIndicadoresSocio(): Promise<TablaIndicadores> {
  return readJson<TablaIndicadores>("sociodemograficos.json");
}

export function loadIndicadoresDemo(): Promise<TablaIndicadores> {
  return readJson<TablaIndicadores>("demo-sintetico.json");
}

export function loadIndicadoresGeo(): Promise<TablaGeometria> {
  return readJson<TablaGeometria>("geometria.json");
}

function ubigeoDe(f: AnyFeature): string {
  const p = (f.properties ?? {}) as unknown as Record<string, unknown>;
  return typeof p["ubigeo"] === "string" ? p["ubigeo"] : "";
}

/**
 * LEFT JOIN de indicadores sobre features. No muta la entrada:
 * retorna features nuevas con `indicadores` (o null si no hay dato).
 */
export function joinIndicadores(
  features: AnyFeature[],
  tabla: TablaIndicadores,
): AnyFeature[] {
  return features.map((f) => ({
    ...f,
    properties: {
      ...((f.properties ?? {}) as unknown as Record<string, unknown>),
      indicadores: tabla.registros[ubigeoDe(f)] ?? null,
    },
  })) as unknown as AnyFeature[];
}

/** Cobertura del join: cuántos features tienen dato. */
export function coberturaIndicadores(
  features: AnyFeature[],
  tabla: TablaIndicadores,
): { total: number; conDatos: number; pct: number } {
  const conDatos = features.filter((f) => tabla.registros[ubigeoDe(f)] !== undefined).length;
  return { total: features.length, conDatos, pct: features.length === 0 ? 0 : conDatos / features.length };
}
