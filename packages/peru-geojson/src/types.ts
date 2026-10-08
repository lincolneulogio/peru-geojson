import type { PropiedadesCanonicas } from "./contrato.js";

/**
 * Tipos públicos de la librería sobre el esquema canónico nuevo
 * (ubigeo + nombre_* en minúsculas, ver contrato.ts). Todo tipado, sin `any`.
 */

export type UbigeoDep = string; // 2 dígitos, ej. "15"
export type UbigeoProv = string; // 4 dígitos, ej. "1501"
export type UbigeoDist = string; // 6 dígitos, ej. "150137"
export type Ubigeo = UbigeoDep | UbigeoProv | UbigeoDist;

/** Nivel para selección de capa (visor/API). */
export type Nivel = "departamental" | "provincial" | "distrital" | "capitales";
/** Nivel según longitud de ubigeo. */
export type NivelUbigeo = "departamental" | "provincial" | "distrital";

export type GeoPolygon = GeoJSON.Polygon | GeoJSON.MultiPolygon;

export interface DepartamentoProps extends PropiedadesCanonicas {
  ubigeo: UbigeoDep;
}

export interface ProvinciaProps extends PropiedadesCanonicas {
  ubigeo: UbigeoProv;
}

export interface DistritoProps extends PropiedadesCanonicas {
  ubigeo: UbigeoDist;
}

export interface CapitalProps extends PropiedadesCanonicas {
  ubigeo: UbigeoProv;
}

export type DepartamentoFeature = GeoJSON.Feature<GeoPolygon, DepartamentoProps>;
export type ProvinciaFeature = GeoJSON.Feature<GeoPolygon, ProvinciaProps>;
export type DistritoFeature = GeoJSON.Feature<GeoPolygon, DistritoProps>;
export type CapitalFeature = GeoJSON.Feature<GeoJSON.Point, CapitalProps>;

export type AnyProps = DepartamentoProps | ProvinciaProps | DistritoProps | CapitalProps;
export type AnyFeature = GeoJSON.Feature<GeoJSON.Geometry, AnyProps>;

export interface Stats {
  departamental: { ok: number };
  provincial: { ok: number };
  distrital: { ok: number };
  capitales: { ok: number };
}
