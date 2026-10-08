import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Sincroniza el pipeline nuevo hacia el paquete publicable.
 * Origen: data/derived/*.min.geojson + data/ubigeo.json + reportes.
 * Elimina los restos del pipeline v2 (nombres con _ y STATS/ubigeo_index).
 */
const root = path.dirname(fileURLToPath(import.meta.url));
const derived = path.resolve(root, "..", "data", "derived");
const validated = path.resolve(root, "..", "data", "validated");
const base = path.resolve(root, "..", "data");
const dst = path.resolve(root, "..", "packages", "peru-geojson", "data");

await fs.mkdir(dst, { recursive: true });
await fs.mkdir(path.join(dst, "nombres"), { recursive: true });

const COPIAS = [
  [derived, "peru-departamental.min.geojson"],
  [derived, "peru-provincial.min.geojson"],
  [derived, "peru-distrital.min.geojson"],
  [derived, "peru-capitales.min.geojson"],
  [base, "ubigeo.json"],
  [validated, "reporte.json"],
  [validated, "reporte.validacion.json"],
];

const COPIAS_DIR = [
  ["indicadores", ["geometria.json", "sociodemograficos.json", "demo-sintetico.json", "schema.json"]],
  ["nombres", ["sobreescrituras.json", "gentilicios.json"]],
  ["equivalencias", ["ubigeo-2007-2026.json", "cambios-2007-2026.csv"]],
  ["espacial", ["distritos.json"]],
];

for (const [dir, file] of COPIAS) {
  await fs.copyFile(path.join(dir, file), path.join(dst, file));
  console.log("sync:", file);
}

for (const [sub, files] of COPIAS_DIR) {
  await fs.mkdir(path.join(dst, sub), { recursive: true });
  for (const file of files) {
    await fs.copyFile(path.join(base, sub, file), path.join(dst, sub, file));
    console.log("sync:", `${sub}/${file}`);
  }
}

const RESTOS_V2 = [
  "peru_departamental.min.geojson",
  "peru_provincial.min.geojson",
  "peru_distrital.min.geojson",
  "peru_capitales.min.geojson",
  "STATS.json",
  "ubigeo_index.json",
];

for (const file of RESTOS_V2) {
  await fs.rm(path.join(dst, file), { force: true });
  console.log("rm resto v2:", file);
}
