import type { AliasLegacy, BBox, NivelUbigeo, RegistroUbigeo } from "peru-geojson/contrato";

const MENORES = new Set(["de", "del", "la", "las", "los", "y", "e"]);

export function nombreVisible(valor: string): string {
  return valor
    .split(" ")
    .filter((parte) => parte.length > 0)
    .map((palabra, indice) => {
      if (indice > 0 && MENORES.has(palabra)) return palabra;
      return palabra.charAt(0).toUpperCase() + palabra.slice(1);
    })
    .join(" ");
}

export interface UbigeoResource {
  ubigeo: string;
  nivel: NivelUbigeo;
  nombre_departamento: string;
  nombre_provincia: string;
  nombre_distrito: string;
  capital: string;
  nombre: string;
  bbox: BBox;
  alias: AliasLegacy;
}

export interface ColeccionRecurso<T> {
  data: T[];
  meta: {
    total: number;
    fuente: string;
    crs: "EPSG:4326";
  };
}

function nombrePrincipal(registro: RegistroUbigeo): string {
  if (registro.nivel === "distrito") return nombreVisible(registro.nombre_distrito);
  if (registro.nivel === "provincia") return nombreVisible(registro.nombre_provincia);
  return nombreVisible(registro.nombre_departamento);
}

export function aRecurso(registro: RegistroUbigeo): UbigeoResource {
  return {
    ubigeo: registro.ubigeo,
    nivel: registro.nivel,
    nombre_departamento: registro.nombre_departamento,
    nombre_provincia: registro.nombre_provincia,
    nombre_distrito: registro.nombre_distrito,
    capital: registro.capital,
    nombre: nombrePrincipal(registro),
    bbox: registro.bbox,
    alias: registro.alias,
  };
}

export function aColeccion(registros: RegistroUbigeo[], fuente: string): ColeccionRecurso<UbigeoResource> {
  return {
    data: registros.map(aRecurso),
    meta: {
      total: registros.length,
      fuente,
      crs: "EPSG:4326",
    },
  };
}
