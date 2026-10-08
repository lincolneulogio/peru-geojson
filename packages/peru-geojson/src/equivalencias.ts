import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Lado de la serie. 2026 es el catálogo canónico (descarga 2026-03-06), no un padrón legal de ese año. */
export type LadoUbigeo = "2007" | "2026";

export type TipoCambioUbigeo = "estable" | "renombrado" | "reasignado" | "creado" | "sin_par_2026";

export type MetodoContenedor = "centroide_dentro" | "vertice_dentro" | "ambiguo" | "sin_contencion";

export interface FilaEquivalencia {
  nivel: "departamento" | "provincia" | "distrito";
  tipo: TipoCambioUbigeo;
  ubigeo_2007: string | null;
  ubigeo_2026: string | null;
  nombre_2007: string;
  nombre_2026: string;
  nombre_departamento: string;
  nombre_provincia_2007: string;
  nombre_provincia_2026: string;
  campos: string[];
  /** Ubigeo 2007 que contiene el centroide. Solo distritos `creado`. No es el decreto. */
  contenedor_2007: string | null;
  contenedor_metodo: MetodoContenedor | null;
}

export interface ResumenEquivalencias {
  "2007": number;
  "2026": number;
  estable: number;
  renombrado: number;
  reasignado: number;
  creado: number;
  sin_par_2026: number;
}

export interface TablaEquivalencias {
  meta: {
    anio_base: 2007;
    anio_destino: 2026;
    [k: string]: unknown;
  };
  resumen: Record<"departamento" | "provincia" | "distrito", ResumenEquivalencias>;
  filas: FilaEquivalencia[];
}

function dataDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "data");
}

export async function loadEquivalencias(): Promise<TablaEquivalencias> {
  const raw = await fs.readFile(path.join(dataDir(), "equivalencias", "ubigeo-2007-2026.json"), "utf-8");
  return JSON.parse(raw) as TablaEquivalencias;
}

/** Fila del código en ese año. Null si el ubigeo no está en el cruce. */
export function cruceUbigeo(
  tabla: TablaEquivalencias,
  ubigeo: string,
  lado: LadoUbigeo,
): FilaEquivalencia | null {
  const clave = lado === "2007" ? "ubigeo_2007" : "ubigeo_2026";
  return tabla.filas.find((fila) => fila[clave] === ubigeo) ?? null;
}

/**
 * Código del otro año cuando hay par (estable, renombrado, reasignado).
 * Un distrito creado no tiene ubigeo 2007: devuelve null. El contenedor
 * geométrico es otra operación y no sustituye al código.
 */
export function ubigeoEquivalente(
  tabla: TablaEquivalencias,
  ubigeo: string,
  desde: LadoUbigeo,
): string | null {
  const encontrada = cruceUbigeo(tabla, ubigeo, desde);
  if (!encontrada || encontrada.tipo === "creado" || encontrada.tipo === "sin_par_2026") return null;
  return desde === "2007" ? encontrada.ubigeo_2026 : encontrada.ubigeo_2007;
}

/** Contenedor geométrico 2007 de un distrito creado. Null si no aplica o no hubo contención única. */
export function contenedorGeometrico(tabla: TablaEquivalencias, ubigeo2026: string): string | null {
  const encontrada = cruceUbigeo(tabla, ubigeo2026, "2026");
  if (!encontrada || encontrada.tipo !== "creado") return null;
  return encontrada.contenedor_2007;
}

/** Filas que rompen una serie: todo lo que no es `estable`. */
export function cambiosUbigeo(tabla: TablaEquivalencias): FilaEquivalencia[] {
  return tabla.filas.filter((fila) => fila.tipo !== "estable");
}
