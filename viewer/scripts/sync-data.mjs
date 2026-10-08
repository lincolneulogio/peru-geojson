import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Copia data/v2/*.min.geojson + STATS a viewer/public/data para servir estático. */
const root = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(root, "..", "..", "data", "v2");
const dst = path.resolve(root, "..", "public", "data");

await fs.mkdir(dst, { recursive: true });
for (const f of await fs.readdir(src)) {
  if (f.endsWith(".min.geojson") || f === "STATS.json" || f === "ubigeo_index.json") {
    await fs.copyFile(path.join(src, f), path.join(dst, f));
    console.log("sync:", f);
  }
}
