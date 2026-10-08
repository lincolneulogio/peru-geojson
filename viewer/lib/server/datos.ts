import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ColeccionUbigeo, FeatureUbigeo, IndiceUbigeo } from "../../../types/Ubigeo";
import { ATRIBUCION, LICENCIA_DATOS } from "../../../types/licencia";
import {
  filtrarRegistros,
  proyectar,
  respuestaBase,
  type ConsultaUbigeo,
  type NivelConsulta,
  type RegistroCapital,
  type RegistroConsulta,
  type RespuestaUbigeo,
} from "../domain/consulta";

export class DatosError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DatosError";
    this.status = status;
  }
}

const ARCHIVO: Record<NivelConsulta, { light: string; preview: string }> = {
  departamento: {
    light: "data/variants/light/departamentos.geojson",
    preview: "data/derived/peru-departamental.preview.geojson",
  },
  provincia: {
    light: "data/variants/light/provincias.geojson",
    preview: "data/derived/peru-provincial.preview.geojson",
  },
  distrito: {
    light: "data/variants/light/distritos.geojson",
    preview: "data/derived/peru-distrital.preview.geojson",
  },
  capital: {
    light: "data/variants/light/capitales.geojson",
    preview: "data/derived/peru-capitales.preview.geojson",
  },
};

export function raizDelRepositorio(): string {
  const cwd = process.cwd().replace(/\\/g, "/");
  if (cwd.endsWith("/viewer")) return path.resolve(process.cwd(), "..");
  return process.cwd();
}

async function leerJson<T>(relativo: string): Promise<T> {
  const absoluto = path.join(raizDelRepositorio(), relativo);
  return JSON.parse(await readFile(absoluto, "utf8")) as T;
}

async function leerPrimero<T>(rutas: string[]): Promise<T> {
  let ultimo: unknown;
  for (const ruta of rutas) {
    try {
      return await leerJson<T>(ruta);
    } catch (error) {
      ultimo = error;
    }
  }
  throw ultimo instanceof Error ? ultimo : new DatosError("No se pudo leer el archivo de datos.", 500);
}

let indicePromise: Promise<IndiceUbigeo> | null = null;
const colecciones = new Map<NivelConsulta, Promise<ColeccionUbigeo>>();

export function cargarIndice(): Promise<IndiceUbigeo> {
  indicePromise ??= leerJson<IndiceUbigeo>("data/ubigeo.json");
  return indicePromise;
}

export function cargarColeccion(nivel: NivelConsulta): Promise<ColeccionUbigeo> {
  const existente = colecciones.get(nivel);
  if (existente) return existente;
  const rutas = ARCHIVO[nivel];
  const promesa = leerPrimero<ColeccionUbigeo>([rutas.light, rutas.preview]);
  colecciones.set(nivel, promesa);
  return promesa;
}

function capitalesDe(coleccion: ColeccionUbigeo): RegistroCapital[] {
  return coleccion.features.flatMap((feature) => {
    if (feature.geometry.type !== "Point") return [];
    const [lon, lat] = feature.geometry.coordinates;
    return [
      {
        nivel: "capital" as const,
        ubigeo: feature.properties.ubigeo,
        nombre_departamento: feature.properties.nombre_departamento,
        nombre_provincia: feature.properties.nombre_provincia,
        nombre_distrito: feature.properties.nombre_distrito,
        capital: feature.properties.capital,
        bbox: [lon, lat, lon, lat],
      },
    ];
  });
}

export async function listarRegistros(): Promise<{ fuente: string; registros: RegistroConsulta[] }> {
  const indice = await cargarIndice();
  const capitales = capitalesDe(await cargarColeccion("capital"));
  return {
    fuente: indice.fuente,
    registros: [...indice.departamentos, ...indice.provincias, ...indice.distritos, ...capitales],
  };
}

export async function consultarUbigeo(consulta: ConsultaUbigeo): Promise<RespuestaUbigeo & { geometria?: FeatureUbigeo }> {
  const { fuente, registros } = await listarRegistros();
  const filtrados = filtrarRegistros(registros, consulta);
  if (consulta.geometria) {
    if (filtrados.length !== 1) {
      throw new DatosError("Para incluir la geometría indica un código que identifique un solo registro.", 400);
    }
    const unico = filtrados[0];
    if (!unico) throw new DatosError("No hay un registro para ese código.", 404);
    const coleccion = await cargarColeccion(unico.nivel);
    const feature = coleccion.features.find((item) => item.properties.ubigeo === unico.ubigeo);
    if (!feature) throw new DatosError("No hay geometría publicada para ese registro.", 404);
    return {
      ...respuestaBase(fuente, 1, [proyectar(unico)]),
      geometria: feature,
    };
  }
  return respuestaBase(fuente, filtrados.length, filtrados.slice(0, consulta.limite).map(proyectar));
}

export interface FiltroMapa {
  nivel: NivelConsulta;
  dep?: string;
  prov?: string;
  q?: string;
}

function coincideTexto(feature: FeatureUbigeo, q: string): boolean {
  const props = feature.properties;
  const texto = [props.ubigeo, props.nombre_departamento, props.nombre_provincia, props.nombre_distrito, props.capital]
    .join(" ")
    .toLowerCase();
  return texto.includes(q.toLowerCase());
}

export interface RespuestaMapa {
  type: "FeatureCollection";
  features: FeatureUbigeo[];
  metadata: {
    licencia: typeof LICENCIA_DATOS;
    atribucion: typeof ATRIBUCION;
  };
}

export async function coleccionParaMapa(filtro: FiltroMapa): Promise<RespuestaMapa> {
  const coleccion = await cargarColeccion(filtro.nivel);
  const q = filtro.q?.trim().toLowerCase() ?? "";
  const features = coleccion.features.filter((feature) => {
    const ubigeo = feature.properties.ubigeo;
    if (filtro.dep && !ubigeo.startsWith(filtro.dep)) return false;
    if (filtro.prov && filtro.nivel === "distrito" && !ubigeo.startsWith(filtro.prov)) return false;
    if (q && !coincideTexto(feature, q)) return false;
    return true;
  });
  return {
    type: "FeatureCollection",
    features,
    metadata: {
      licencia: LICENCIA_DATOS,
      atribucion: ATRIBUCION,
    },
  };
}

export interface Conteos {
  departamentos: number;
  provincias: number;
  distritos: number;
  capitales: number;
}

export async function cargarConteos(): Promise<Conteos> {
  const indice = await cargarIndice();
  const capitales = await cargarColeccion("capital");
  return {
    departamentos: indice.departamentos.length,
    provincias: indice.provincias.length,
    distritos: indice.distritos.length,
    capitales: capitales.features.length,
  };
}
