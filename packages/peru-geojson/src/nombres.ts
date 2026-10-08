import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CONECTORES = new Set(["de", "del", "la", "el", "los", "las", "y", "e", "en", "al"]);
const ROMANOS = new Set([
  "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x",
  "xi", "xii", "xiii", "xiv", "xv", "xvi", "xvii", "xviii", "xix", "xx",
]);

export interface TablasNombres {
  sobreescrituras: Record<string, string>;
  gentilicios: Record<string, string | null>;
}

function dataDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "data");
}

/** Carga sobreescrituras verificadas + gentilicios incluidos en el paquete. */
export async function loadNombres(): Promise<TablasNombres> {
  const base = path.join(dataDir(), "nombres");
  const sobre = JSON.parse(await fs.readFile(path.join(base, "sobreescrituras.json"), "utf-8")) as {
    sobreescrituras: Record<string, string>;
  };
  const gent = JSON.parse(await fs.readFile(path.join(base, "gentilicios.json"), "utf-8")) as Record<
    string,
    string | null
  >;
  delete (gent as Record<string, unknown>)["_nota"];
  return { sobreescrituras: sobre.sobreescrituras, gentilicios: gent };
}

/**
 * Nombre presentable desde minúsculas sin tildes.
 * 1) override verificado gana; 2) Title-Case con conectores en minúscula
 * y romanos en mayúscula. Las tildes impredecibles van al archivo, no a reglas.
 */
export function aNombreOficial(minusculas: string, overrides?: Record<string, string>): string {
  const clave = minusculas.trim().toLowerCase().replace(/\s+/g, " ");
  if (overrides?.[clave] !== undefined) return overrides[clave];
  return clave
    .split(" ")
    .map((w, i) => {
      if (ROMANOS.has(w)) return w.toUpperCase();
      if (i > 0 && CONECTORES.has(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

/** Gentilicio verificado o null (nunca inventa). Clave en minúsculas sin tildes. */
export function gentilicio(nombreMinusculas: string, mapa?: Record<string, string | null>): string | null {
  if (!mapa) return null;
  const clave = nombreMinusculas.trim().toLowerCase().replace(/\s+/g, " ");
  return mapa[clave] ?? null;
}
