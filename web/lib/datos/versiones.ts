import { existsSync, readFileSync } from "node:fs";
import { rutaDatos } from "@/lib/datos/rutas";

export interface ConteosVersion {
  departamentos: number;
  provincias: number;
  distritos: number;
  capitales: number;
}

export interface VersionResumen {
  id: string;
  anio_cartografico: number;
  etiqueta: string;
  manifiesto: string;
  conteos: ConteosVersion;
}

export interface CatalogoVersiones {
  actual: string;
  politica: string;
  versiones: VersionResumen[];
}

export interface ArtefactoVersion {
  id: string;
  ruta: string;
  bytes: number;
  sha256: string;
}

export interface ManifiestoVersion {
  id: string;
  anio_cartografico: number;
  etiqueta: string;
  fuente: string;
  descarga_last_modified: string;
  portal: string;
  crs: "EPSG:4326";
  licencia: string;
  licencia_url: string;
  congelado_en: string;
  almacen: "canonico";
  conteos: ConteosVersion;
  bbox: [number, number, number, number];
  nota: string;
  cdn: { pmtiles: string };
  artefactos: ArtefactoVersion[];
}

function leerJson<T>(...partes: string[]): T {
  return JSON.parse(readFileSync(rutaDatos(...partes), "utf8")) as T;
}

export function leerVersiones(): CatalogoVersiones {
  return leerJson<CatalogoVersiones>("versiones.json");
}

export function leerManifiesto(anio: string): ManifiestoVersion | null {
  if (!/^\d{4}$/.test(anio)) return null;
  const partes = [`v${anio}`, "MANIFEST.json"] as const;
  if (!existsSync(rutaDatos(...partes))) return null;
  return leerJson<ManifiestoVersion>(...partes);
}

export function edicionActual(catalogo: CatalogoVersiones): VersionResumen {
  const hallada = catalogo.versiones.find((item) => item.id === catalogo.actual);
  if (!hallada) {
    throw new Error(`No existe la versión cartográfica ${catalogo.actual}.`);
  }
  return hallada;
}
