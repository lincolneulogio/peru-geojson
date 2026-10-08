import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const { topology } = createRequire(import.meta.url)("topojson-server");
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const niveles = ["departamental", "provincial", "distrital", "capitales"];

for (const nivel of niveles) {
  const origen = path.join(raiz, "data", "derived", `peru-${nivel}.min.geojson`);
  const coleccion = JSON.parse(readFileSync(origen, "utf8"));
  const topo = topology({ peru: coleccion }, 1e6);
  topo.metadata = {
    ...(coleccion.metadata ?? {}),
    variante: "topojson",
    objeto: "peru",
    cuantizacion: 1e6,
    generado_por: "peru-geojson/scripts/derive.mjs",
  };
  const destino = path.join(raiz, "data", "derived", `peru-${nivel}.topojson`);
  writeFileSync(destino, JSON.stringify(topo));
  console.log(`${path.relative(raiz, destino)} objetos=${topo.objects.peru.geometries.length}`);
}
