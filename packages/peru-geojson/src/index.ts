/** API pública de `peru-geojson`. Importa solo lo que uses (tree-shakable). */
export type {
  AnyFeature,
  AnyProps,
  CapitalFeature,
  CapitalProps,
  DepartamentoFeature,
  DepartamentoProps,
  DistritoFeature,
  DistritoProps,
  Nivel,
  NivelUbigeo,
  ProvinciaFeature,
  ProvinciaProps,
  Stats,
  Ubigeo,
  UbigeoDep,
  UbigeoDist,
  UbigeoProv,
} from "./types.js";
export {
  buscarPorNombre,
  filtrarFeatures,
} from "./search.js";
export type { FiltroGeo } from "./search.js";
export {
  esUbigeoValido,
  nivelDeUbigeo,
  normalizarTexto,
  perteneceA,
  ubigeoPadre,
} from "./ubigeo.js";
export {
  loadCapitales,
  loadDepartamental,
  loadDistrital,
  loadNivel,
  loadProvincial,
  loadStats,
  loadUbigeoIndex,
} from "./data.js";
export type {
  CapitalesFC as CapitalesCollection,
  DepartamentalFC as DepartamentalCollection,
  DistritalFC as DistritalCollection,
  ProvincialFC as ProvincialCollection,
  UbigeoIndex,
} from "./data.js";
export {
  ATRIBUCION,
  LICENCIA_DATOS,
  LICENCIA_DATOS_URL,
} from "./contrato.js";
export type {
  BBox,
  ColeccionUbigeo,
  Departamento as DepartamentoRegistro,
  Distrito as DistritoRegistro,
  FeatureUbigeo,
  IndiceUbigeo,
  MetadataGeo,
  PropiedadesCanonicas,
  Provincia as ProvinciaRegistro,
  RegistroUbigeo,
} from "./contrato.js";
