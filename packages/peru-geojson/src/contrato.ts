/**
 * Contrato canónico de la librería peru-geojson.
 * Nombres en minúsculas, sin tildes. Los alias legacy viven en `alias`.
 */

export const LICENCIA_DATOS = "CC-BY-4.0" as const;

export const LICENCIA_DATOS_URL = "https://creativecommons.org/licenses/by/4.0/";

export const ATRIBUCION =
  "Instituto Nacional de Estadística e Informática (INEI). Límites departamentales, provinciales y distritales: IDE-INEI, actualización 2023. Capitales de provincia: Infraestructura de Datos Espaciales del Perú (IDEP), 2016.";

export type BBox = [number, number, number, number];

export type NivelUbigeo = "departamento" | "provincia" | "distrito";

export interface AliasLegacy {
  NOMBDEP?: string;
  FIRST_IDDP?: string;
  NOMBPROV?: string;
  FIRST_IDPR?: string;
  FIRST_NOMB?: string;
  NOMBDIST?: string;
  IDDIST?: string;
  IDDPTO?: string;
  IDPROV?: string;
  NOM_CAP?: string;
  CAPITAL?: string;
  DEPARTAM?: string;
  PROVINCIA?: string;
  DISTRITO?: string;
  CCDD?: string;
  CCPP?: string;
  CCDI?: string;
}

export interface PropiedadesCanonicas {
  ubigeo: string;
  nombre_departamento: string;
  nombre_provincia: string;
  nombre_distrito: string;
  capital: string;
}

export interface PropiedadesValidadas extends PropiedadesCanonicas, AliasLegacy {}

export interface RegistroUbigeo extends PropiedadesCanonicas {
  nivel: NivelUbigeo;
  bbox: BBox;
  alias: AliasLegacy;
}

export interface IndiceUbigeo {
  fuente: string;
  descarga_last_modified: string;
  crs: "EPSG:4326";
  departamentos: RegistroUbigeo[];
  provincias: RegistroUbigeo[];
  distritos: RegistroUbigeo[];
}

export interface MetadataGeo {
  fuente: string;
  descarga_last_modified: string;
  portal: string;
  crs: "EPSG:4326";
  precision_decimales: number;
  simplificacion_grados: number;
  generado_por: string;
}

export interface GeometriaPoligonal {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
}

export interface GeometriaPunto {
  type: "Point";
  coordinates: [number, number];
}

export interface FeatureUbigeo {
  type: "Feature";
  id: string;
  bbox?: BBox;
  properties: PropiedadesValidadas;
  geometry: GeometriaPoligonal | GeometriaPunto;
}

export interface ColeccionUbigeo {
  type: "FeatureCollection";
  bbox: BBox;
  metadata: MetadataGeo;
  features: FeatureUbigeo[];
}

export interface Departamento extends RegistroUbigeo {
  nivel: "departamento";
}

export interface Provincia extends RegistroUbigeo {
  nivel: "provincia";
}

export interface Distrito extends RegistroUbigeo {
  nivel: "distrito";
}
