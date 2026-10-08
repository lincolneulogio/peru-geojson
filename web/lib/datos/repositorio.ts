import { existsSync, readFileSync } from "node:fs";
import type { ColeccionUbigeo, IndiceUbigeo, RegistroUbigeo } from "peru-geojson/contrato";
import { rutaDatos } from "@/lib/datos/rutas";

export class SolicitudInvalida extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "SolicitudInvalida";
  }
}

interface Almacen {
  indice: IndiceUbigeo;
  geo: Record<"departamental" | "provincial" | "distrital" | "capitales", ColeccionUbigeo>;
}

let almacen: Almacen | null = null;

function leerJson<T>(...partes: string[]): T {
  return JSON.parse(readFileSync(rutaDatos(...partes), "utf8")) as T;
}

const GEO_LIGHT: Record<NivelGeo, string> = {
  departamental: "departamentos.geojson",
  provincial: "provincias.geojson",
  distrital: "distritos.geojson",
  capitales: "capitales.geojson",
};

const GEO_PREVIEW: Record<NivelGeo, string> = {
  departamental: "peru-departamental.preview.geojson",
  provincial: "peru-provincial.preview.geojson",
  distrital: "peru-distrital.preview.geojson",
  capitales: "peru-capitales.preview.geojson",
};

const GEO_VALIDADO: Record<NivelGeo, string> = {
  departamental: "peru-departamental.validated.geojson",
  provincial: "peru-provincial.validated.geojson",
  distrital: "peru-distrital.validated.geojson",
  capitales: "peru-capitales.validated.geojson",
};

function leerColeccion(nivel: NivelGeo): ColeccionUbigeo {
  const light = rutaDatos("variants", "light", GEO_LIGHT[nivel]);
  if (existsSync(light)) {
    return JSON.parse(readFileSync(light, "utf8")) as ColeccionUbigeo;
  }
  const preview = rutaDatos("derived", GEO_PREVIEW[nivel]);
  if (existsSync(preview)) {
    return JSON.parse(readFileSync(preview, "utf8")) as ColeccionUbigeo;
  }
  return leerJson<ColeccionUbigeo>("validated", GEO_VALIDADO[nivel]);
}

function cargar(): Almacen {
  if (!almacen) {
    almacen = {
      indice: leerJson<IndiceUbigeo>("ubigeo.json"),
      geo: {
        departamental: leerColeccion("departamental"),
        provincial: leerColeccion("provincial"),
        distrital: leerColeccion("distrital"),
        capitales: leerColeccion("capitales"),
      },
    };
  }
  return almacen;
}

export function fuenteDatos(): string {
  return cargar().indice.fuente;
}

export function departamentos(): RegistroUbigeo[] {
  return cargar().indice.departamentos;
}

export function provincias(dep: string): RegistroUbigeo[] {
  return cargar().indice.provincias.filter((item) => item.ubigeo.startsWith(dep));
}

export function distritos(filtro: { dep?: string; prov?: string }): RegistroUbigeo[] {
  const prefijo = filtro.prov ?? filtro.dep ?? "";
  if (!prefijo) {
    throw new SolicitudInvalida("Indica dep (2 dígitos) o prov (4 dígitos).");
  }
  return cargar().indice.distritos.filter((item) => item.ubigeo.startsWith(prefijo));
}

export function buscar(consulta: string): RegistroUbigeo[] {
  const q = consulta.trim().toLowerCase();
  if (!q) return [];
  const indice = cargar().indice;
  const todos = [...indice.departamentos, ...indice.provincias, ...indice.distritos];
  if (/^\d+$/.test(q)) {
    return todos.filter((item) => item.ubigeo.startsWith(q)).slice(0, 40);
  }
  return todos
    .filter((item) =>
      [item.nombre_departamento, item.nombre_provincia, item.nombre_distrito, item.capital, item.ubigeo]
        .join(" ")
        .includes(q),
    )
    .slice(0, 40);
}

export type NivelGeo = "departamental" | "provincial" | "distrital" | "capitales";

export function geoFiltrado(nivel: NivelGeo, ubigeo?: string): ColeccionUbigeo {
  if (nivel === "distrital" && !ubigeo) {
    throw new SolicitudInvalida("Para distritos indica un ubigeo de departamento o provincia.");
  }
  const base = cargar().geo[nivel];
  const features = ubigeo
    ? base.features.filter((feature) => String(feature.properties.ubigeo).startsWith(ubigeo))
    : base.features;
  const bbox = bboxDe(features);
  return {
    type: "FeatureCollection",
    bbox: bbox ?? base.bbox,
    metadata: base.metadata,
    features,
  };
}

function bboxDe(features: ColeccionUbigeo["features"]): ColeccionUbigeo["bbox"] | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const walk = (coords: unknown): void => {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === "number" && typeof coords[1] === "number") {
      minX = Math.min(minX, coords[0]);
      minY = Math.min(minY, coords[1]);
      maxX = Math.max(maxX, coords[0]);
      maxY = Math.max(maxY, coords[1]);
      return;
    }
    for (const item of coords) walk(item);
  };
  for (const feature of features) walk(feature.geometry.coordinates);
  if (!Number.isFinite(minX)) return null;
  return [minX, minY, maxX, maxY];
}
