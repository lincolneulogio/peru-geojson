import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const { hint } = createRequire(import.meta.url)("@mapbox/geojsonhint");

const archivos = process.argv.slice(2);
let fallo = false;

for (const archivo of archivos) {
  const datos = JSON.parse(readFileSync(archivo, "utf8"));
  const avisos = hint(datos, { precisionWarning: false, ignoreRightHandRule: false });
  const graves = avisos.filter((aviso) => {
    const mensaje = String(aviso.message || "");
    return !mensaje.includes("right-hand rule");
  });
  if (graves.length) {
    fallo = true;
    console.error(`${archivo}: ${graves.length} avisos`);
    for (const aviso of graves.slice(0, 20)) {
      console.error(`  L${aviso.line ?? "?"}: ${aviso.message}`);
    }
  } else {
    console.log(`${archivo}: ok (${avisos.length} avisos de orientacion ignorados)`);
  }
}

process.exit(fallo ? 1 : 0);
