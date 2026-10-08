import type { BBox, NivelUbigeo, RegistroUbigeo } from "../../../types/Ubigeo";
import { ATRIBUCION, LICENCIA_DATOS, LICENCIA_DATOS_URL } from "../../../types/licencia";

export type NivelConsulta = NivelUbigeo | "capital";

export interface RegistroCapital {
  nivel: "capital";
  ubigeo: string;
  nombre_departamento: string;
  nombre_provincia: string;
  nombre_distrito: string;
  capital: string;
  bbox: BBox;
}

export type RegistroConsulta = RegistroUbigeo | RegistroCapital;

export interface RegistroPublico {
  nivel: NivelConsulta;
  ubigeo: string;
  nombre: string;
  nombre_departamento: string;
  nombre_provincia: string;
  nombre_distrito: string;
  capital: string;
  bbox: BBox;
}

export interface ConsultaUbigeo {
  nivel?: NivelConsulta;
  q?: string;
  codigo?: string;
  padre?: string;
  geometria: boolean;
  limite: number;
}

export interface RespuestaUbigeo {
  licencia: typeof LICENCIA_DATOS;
  licencia_url: typeof LICENCIA_DATOS_URL;
  atribucion: typeof ATRIBUCION;
  fuente: string;
  coincidencias: number;
  devueltos: number;
  resultados: RegistroPublico[];
}

const PALABRAS_MENORES = new Set(["de", "del", "la", "las", "los", "y", "e"]);

export function presentarNombre(nombre: string): string {
  return nombre
    .toLowerCase()
    .split(" ")
    .filter((parte) => parte.length > 0)
    .map((palabra, indice) => {
      if (indice > 0 && PALABRAS_MENORES.has(palabra)) return palabra;
      return palabra.charAt(0).toUpperCase() + palabra.slice(1);
    })
    .join(" ");
}

export function fold(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function nombreVisible(registro: RegistroConsulta): string {
  switch (registro.nivel) {
    case "departamento":
      return registro.nombre_departamento;
    case "provincia":
      return registro.nombre_provincia;
    case "distrito":
      return registro.nombre_distrito;
    case "capital":
      return registro.capital;
  }
}

export function proyectar(registro: RegistroConsulta): RegistroPublico {
  return {
    nivel: registro.nivel,
    ubigeo: registro.ubigeo,
    nombre: nombreVisible(registro),
    nombre_departamento: registro.nombre_departamento,
    nombre_provincia: registro.nombre_provincia,
    nombre_distrito: registro.nombre_distrito,
    capital: registro.capital,
    bbox: registro.bbox,
  };
}

function textoDe(registro: RegistroConsulta): string {
  return fold(
    [
      registro.ubigeo,
      registro.nombre_departamento,
      registro.nombre_provincia,
      registro.nombre_distrito,
      registro.capital,
    ].join(" "),
  );
}

export function filtrarRegistros(registros: RegistroConsulta[], consulta: ConsultaUbigeo): RegistroConsulta[] {
  const q = consulta.q ? fold(consulta.q) : "";
  return registros
    .filter((registro) => {
      if (consulta.nivel && registro.nivel !== consulta.nivel) return false;
      if (consulta.codigo && registro.ubigeo !== consulta.codigo && !registro.ubigeo.startsWith(consulta.codigo)) {
        return false;
      }
      if (consulta.padre && !registro.ubigeo.startsWith(consulta.padre)) return false;
      if (q && !textoDe(registro).includes(q)) return false;
      return true;
    })
    .sort((a, b) => a.ubigeo.localeCompare(b.ubigeo, "es") || nombreVisible(a).localeCompare(nombreVisible(b), "es"));
}

export function normalizarNivel(valor: string | null): NivelConsulta | "invalido" | undefined {
  switch (valor) {
    case null:
    case "":
      return undefined;
    case "departamento":
    case "departamental":
      return "departamento";
    case "provincia":
    case "provincial":
      return "provincia";
    case "distrito":
    case "distrital":
      return "distrito";
    case "capital":
    case "capitales":
      return "capital";
    default:
      return "invalido";
  }
}

export interface ConsultaInvalida {
  ok: false;
  error: string;
}

export interface ConsultaValida {
  ok: true;
  consulta: ConsultaUbigeo;
}

export function leerConsulta(params: URLSearchParams): ConsultaValida | ConsultaInvalida {
  const nivel = normalizarNivel(params.get("nivel"));
  if (nivel === "invalido") return { ok: false, error: "nivel inválido" };
  const q = params.get("q")?.trim() ?? "";
  if (q.length > 80) return { ok: false, error: "q supera 80 caracteres" };
  const codigo = params.get("codigo")?.trim() ?? "";
  if (codigo && !/^\d{2,6}$/.test(codigo)) return { ok: false, error: "codigo inválido" };
  const padre = params.get("padre")?.trim() ?? "";
  if (padre && !/^\d{2}(\d{2})?$/.test(padre)) return { ok: false, error: "padre inválido" };
  const limiteTexto = params.get("limite");
  const limite = limiteTexto ? Number(limiteTexto) : 20;
  if (!Number.isInteger(limite) || limite < 1 || limite > 200) {
    return { ok: false, error: "limite debe ser un entero entre 1 y 200" };
  }
  const geometria = params.get("geometria") ?? "0";
  if (geometria !== "0" && geometria !== "1") return { ok: false, error: "geometria debe ser 0 o 1" };
  return {
    ok: true,
    consulta: {
      nivel,
      q: q || undefined,
      codigo: codigo || undefined,
      padre: padre || undefined,
      geometria: geometria === "1",
      limite,
    },
  };
}

export function respuestaBase(fuente: string, coincidencias: number, resultados: RegistroPublico[]): RespuestaUbigeo {
  return {
    licencia: LICENCIA_DATOS,
    licencia_url: LICENCIA_DATOS_URL,
    atribucion: ATRIBUCION,
    fuente,
    coincidencias,
    devueltos: resultados.length,
    resultados,
  };
}
