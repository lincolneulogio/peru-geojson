/** Tipos del visor: re-exporta la librería (fuente única) + estado local UI. */
export type {
  CapitalProps,
  DepartamentoProps,
  DistritoProps,
  Nivel,
  ProvinciaProps,
  Stats,
} from "peru-geojson";

export interface Seleccion {
  dep: string | null;
  prov: string | null;
}
