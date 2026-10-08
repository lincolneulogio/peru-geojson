import path from "node:path";

const NIVELES = new Set(["departamental", "provincial", "distrital", "capitales"]);

function opciones(argv) {
  const mapa = new Map();
  const banderas = new Set();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg?.startsWith("--")) continue;
    const clave = arg.slice(2);
    const siguiente = argv[i + 1];
    if (!siguiente || siguiente.startsWith("--")) {
      banderas.add(clave);
      continue;
    }
    mapa.set(clave, siguiente);
    i += 1;
  }
  return { mapa, banderas };
}

function ayuda() {
  console.log(`Uso:
  pnpm --filter peru-geojson shapefile -- --input limite.shp --nivel departamental --output salida.geojson
  pnpm --filter peru-geojson shapefile -- --input limite.shp --list-fields

Niveles: departamental | provincial | distrital | capitales
El .dbf hermano se lee junto al .shp. Codificación por defecto: windows-1252 (--encoding utf-8).
Escribe propiedades canónicas (ubigeo, nombre_departamento, nombre_provincia, nombre_distrito, capital)
y conserva los campos originales en alias.`);
}

function normalizarClaves(propiedades) {
  const mapa = new Map();
  for (const [clave, valor] of Object.entries(propiedades ?? {})) {
    mapa.set(clave.toLowerCase(), valor);
  }
  return mapa;
}

function leerCampo(mapa, alias) {
  for (const nombre of alias) {
    if (!mapa.has(nombre)) continue;
    const valor = mapa.get(nombre);
    if (valor === null || valor === undefined) continue;
    return String(valor).trim();
  }
  return "";
}

function canonico(nivel, propiedades) {
  const mapa = normalizarClaves(propiedades);
  const departamento = leerCampo(mapa, ["nombdep", "departamento", "departamen", "nom_dpto", "nombdep"]);
  const provincia = leerCampo(mapa, ["nombprov", "provincia", "nom_prov"]);
  const distrito = leerCampo(mapa, ["nombdist", "distrito", "nom_dist"]);
  const capital = leerCampo(mapa, ["nom_cap", "capital", "nomb_cap"]);
  let ubigeo = "";
  if (nivel === "departamental") {
    ubigeo = leerCampo(mapa, ["first_iddp", "iddpto", "ubigeo", "ccdd", "codigo"]);
  } else if (nivel === "provincial") {
    ubigeo = leerCampo(mapa, ["first_idpr", "idprov", "ubigeo", "ccpp", "codigo"]);
  } else if (nivel === "distrital") {
    ubigeo = leerCampo(mapa, ["iddist", "ubigeo", "ccdi", "codigo"]);
  } else {
    ubigeo = leerCampo(mapa, ["ubigeo", "idprov", "first_idpr", "ccpp"]);
  }
  ubigeo = ubigeo.replace(/\D/g, "");
  const ancho = nivel === "departamental" ? 2 : nivel === "capitales" ? 4 : nivel === "provincial" ? 4 : 6;
  if (ubigeo) ubigeo = ubigeo.padStart(ancho, "0");
  return {
    ubigeo,
    nombre_departamento: departamento.toLowerCase(),
    nombre_provincia: provincia.toLowerCase(),
    nombre_distrito: distrito.toLowerCase(),
    capital: capital.toLowerCase(),
    alias: propiedades ?? {},
  };
}

const { mapa, banderas } = opciones(process.argv.slice(2));
if (banderas.has("help") || process.argv.length <= 2) {
  ayuda();
  process.exit(banderas.has("help") ? 0 : 1);
}

const entrada = mapa.get("input");
if (!entrada) {
  console.error("Falta --input.");
  ayuda();
  process.exit(1);
}

const { read } = await import("shapefile");
const encoding = mapa.get("encoding") ?? "windows-1252";
const coleccion = await read(entrada, undefined, { encoding });

if (banderas.has("list-fields")) {
  const primera = coleccion.features[0];
  console.log(Object.keys(primera?.properties ?? {}).join("\n"));
  process.exit(0);
}

const nivel = mapa.get("nivel");
const destino = mapa.get("output");
if (!nivel || !NIVELES.has(nivel) || !destino) {
  console.error("Hacen falta --nivel y --output válidos.");
  ayuda();
  process.exit(1);
}

let sinUbigeo = 0;
const features = coleccion.features.map((feature) => {
  const properties = canonico(nivel, feature.properties);
  if (!properties.ubigeo) sinUbigeo += 1;
  return { type: "Feature", properties, geometry: feature.geometry };
});

if (sinUbigeo === features.length) {
  console.error("Ningún registro trae un campo de ubigeo reconocible. Usa --list-fields.");
  process.exit(1);
}

const salida = {
  type: "FeatureCollection",
  metadata: {
    generado_por: "scripts/shapefile-to-geojson.mjs",
    origen: path.basename(entrada),
    nivel,
    encoding,
    licencia: "CC-BY-4.0",
  },
  features,
};

const { writeFileSync, mkdirSync } = await import("node:fs");
mkdirSync(path.dirname(path.resolve(destino)), { recursive: true });
writeFileSync(destino, JSON.stringify(salida));
console.log(`OK ${features.length} features -> ${destino} (sin ubigeo: ${sinUbigeo})`);
