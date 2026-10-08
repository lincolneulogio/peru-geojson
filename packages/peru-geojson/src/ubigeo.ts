import type { NivelUbigeo, Ubigeo } from "./types.js";

const UBIGEO_RE = /^\d{2}(\d{2}(\d{2})?)?$/;

/** Normaliza texto para búsqueda: minúsculas, sin tildes, espacios simples. */
export function normalizarTexto(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** ¿Tiene forma válida de ubigeo? (2, 4 o 6 dígitos). No verifica existencia. */
export function esUbigeoValido(ubigeo: string): ubigeo is Ubigeo {
  return UBIGEO_RE.test(ubigeo.trim());
}

/** Nivel geográfico según longitud del ubigeo. Retorna null si es inválido. */
export function nivelDeUbigeo(ubigeo: string): NivelUbigeo | null {
  const u = ubigeo.trim();
  if (!esUbigeoValido(u)) return null;
  if (u.length === 2) return "departamental";
  if (u.length === 4) return "provincial";
  return "distrital";
}

/** Ubigeo del padre directo: distrito→provincia, provincia→departamento, dep→null. */
export function ubigeoPadre(ubigeo: string): string | null {
  const nivel = nivelDeUbigeo(ubigeo);
  if (nivel === null) return null;
  if (nivel === "departamental") return null;
  if (nivel === "provincial") return ubigeo.slice(0, 2);
  return ubigeo.slice(0, 4);
}

/** ¿`child` pertenece a `parent`? Ej. perteneceA("150137", "15") === true. */
export function perteneceA(child: string, parent: string): boolean {
  if (!esUbigeoValido(child) || !esUbigeoValido(parent)) return false;
  if (parent.length >= child.length) return child === parent;
  return child.startsWith(parent);
}
