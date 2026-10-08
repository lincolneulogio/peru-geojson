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
export {
  coberturaIndicadores,
  joinIndicadores,
  loadIndicadoresDemo,
  loadIndicadoresGeo,
  loadIndicadoresSocio,
} from "./indicadores.js";
export type {
  EstadoIndicadores,
  IndicadorGeometrico,
  IndicadorSociodemografico,
  TablaGeometria,
  TablaIndicadores,
} from "./indicadores.js";
export { puntoEnAnillo, puntoEnPoligono, reverseGeocode } from "./geo.js";
export type { Punto, ResultadoInverso } from "./geo.js";
export { aNombreOficial, gentilicio, loadNombres } from "./nombres.js";
export type { TablasNombres } from "./nombres.js";
export {
  cambiosUbigeo,
  contenedorGeometrico,
  cruceUbigeo,
  loadEquivalencias,
  ubigeoEquivalente,
} from "./equivalencias.js";
export type {
  FilaEquivalencia,
  LadoUbigeo,
  MetodoContenedor,
  ResumenEquivalencias,
  TablaEquivalencias,
  TipoCambioUbigeo,
} from "./equivalencias.js";
export {
  altitudCentroide,
  loadEspacialDistritos,
  registroEspacial,
  vecinosDe,
} from "./espacial.js";
export type { RegistroEspacialDistrito, TablaEspacialDistritos } from "./espacial.js";
