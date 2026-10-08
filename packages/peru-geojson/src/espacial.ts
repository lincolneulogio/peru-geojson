import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { BBox } from "./contrato.js";

export interface RegistroEspacialDistrito {
  centroide: [number, number];
  bbox: BBox;
  /** Metros del centroide en Copernicus DEM GLO-90. No es la cota de la capital. */
  altitud_centroide_m: number | null;
  vecinos: string[];
}

export interface TablaEspacialDistritos {
  meta: {
    nivel: "distrito";
    n: number;
    [k: string]: unknown;
  };
  distritos: Record<string, RegistroEspacialDistrito>;
}

function dataDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "data");
}

export async function loadEspacialDistritos(): Promise<TablaEspacialDistritos> {
  const raw = await fs.readFile(path.join(dataDir(), "espacial", "distritos.json"), "utf-8");
  return JSON.parse(raw) as TablaEspacialDistritos;
}

export function registroEspacial(
  tabla: TablaEspacialDistritos,
  ubigeo: string,
): RegistroEspacialDistrito | null {
  return tabla.distritos[ubigeo] ?? null;
}

/** Vecinos por frontera compartida. Lista vacía si el distrito es isla o no está. */
export function vecinosDe(tabla: TablaEspacialDistritos, ubigeo: string): string[] {
  return tabla.distritos[ubigeo]?.vecinos ?? [];
}

export function altitudCentroide(tabla: TablaEspacialDistritos, ubigeo: string): number | null {
  const valor = tabla.distritos[ubigeo]?.altitud_centroide_m;
  return valor === undefined ? null : valor;
}
