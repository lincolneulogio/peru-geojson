'use strict';

var fs = require('fs');
var path3 = require('path');
var url = require('url');

var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var path3__default = /*#__PURE__*/_interopDefault(path3);

// src/ubigeo.ts
var UBIGEO_RE = /^\d{2}(\d{2}(\d{2})?)?$/;
function normalizarTexto(s) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}
function esUbigeoValido(ubigeo) {
  return UBIGEO_RE.test(ubigeo.trim());
}
function nivelDeUbigeo(ubigeo) {
  const u = ubigeo.trim();
  if (!esUbigeoValido(u)) return null;
  if (u.length === 2) return "departamental";
  if (u.length === 4) return "provincial";
  return "distrital";
}
function ubigeoPadre(ubigeo) {
  const nivel = nivelDeUbigeo(ubigeo);
  if (nivel === null) return null;
  if (nivel === "departamental") return null;
  if (nivel === "provincial") return ubigeo.slice(0, 2);
  return ubigeo.slice(0, 4);
}
function perteneceA(child, parent) {
  if (!esUbigeoValido(child) || !esUbigeoValido(parent)) return false;
  if (parent.length >= child.length) return child === parent;
  return child.startsWith(parent);
}

// src/search.ts
function propsDe(f) {
  return f.properties ?? {};
}
function textoBuscable(f) {
  const p = propsDe(f);
  const partes = [p["ubigeo"], p["nombre_departamento"], p["nombre_provincia"], p["nombre_distrito"], p["capital"]].filter(
    (v) => typeof v === "string"
  );
  return normalizarTexto(partes.join(" "));
}
function filtrarFeatures(features, filtro) {
  const q = normalizarTexto(filtro.q ?? "");
  return features.filter((f) => {
    const p = propsDe(f);
    const ub = typeof p["ubigeo"] === "string" ? p["ubigeo"] : "";
    if (filtro.dep != null && filtro.dep !== "") {
      if (!ub.startsWith(filtro.dep)) return false;
    }
    if (filtro.nivel === "distrital" && filtro.prov != null && filtro.prov !== "") {
      if (!ub.startsWith(filtro.prov)) return false;
    }
    if (q !== "") {
      if (!textoBuscable(f).includes(q)) return false;
    }
    return true;
  });
}
function buscarPorNombre(features, query, nivel) {
  return filtrarFeatures(features, { nivel, q: query });
}
function dataDir() {
  const here = path3__default.default.dirname(url.fileURLToPath((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('index.cjs', document.baseURI).href))));
  return path3__default.default.resolve(here, "..", "data");
}
async function readJson(file) {
  const raw = await fs.promises.readFile(path3__default.default.join(dataDir(), file), "utf-8");
  return JSON.parse(raw);
}
var FILES = {
  departamental: "peru-departamental.min.geojson",
  provincial: "peru-provincial.min.geojson",
  distrital: "peru-distrital.min.geojson",
  capitales: "peru-capitales.min.geojson"
};
function loadDepartamental() {
  return readJson(FILES.departamental);
}
function loadProvincial() {
  return readJson(FILES.provincial);
}
function loadDistrital() {
  return readJson(FILES.distrital);
}
function loadCapitales() {
  return readJson(FILES.capitales);
}
function loadUbigeoIndex() {
  return readJson("ubigeo.json");
}
async function loadStats() {
  const [indice, capitales] = await Promise.all([loadUbigeoIndex(), loadCapitales()]);
  return {
    departamental: { ok: indice.departamentos.length },
    provincial: { ok: indice.provincias.length },
    distrital: { ok: indice.distritos.length },
    capitales: { ok: capitales.features.length }
  };
}
var LOADERS = {
  departamental: loadDepartamental,
  provincial: loadProvincial,
  distrital: loadDistrital,
  capitales: loadCapitales
};
function loadNivel(nivel) {
  return LOADERS[nivel]();
}

// src/contrato.ts
var LICENCIA_DATOS = "CC-BY-4.0";
var LICENCIA_DATOS_URL = "https://creativecommons.org/licenses/by/4.0/";
var ATRIBUCION = "Instituto Nacional de Estad\xEDstica e Inform\xE1tica (INEI). L\xEDmites departamentales, provinciales y distritales: IDE-INEI, actualizaci\xF3n 2023. Capitales de provincia: Infraestructura de Datos Espaciales del Per\xFA (IDEP), 2016.";
function dataDir2() {
  const here = path3__default.default.dirname(url.fileURLToPath((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('index.cjs', document.baseURI).href))));
  return path3__default.default.resolve(here, "..", "data");
}
async function readJson2(file) {
  const raw = await fs.promises.readFile(path3__default.default.join(dataDir2(), file), "utf-8");
  return JSON.parse(raw);
}
function loadIndicadoresSocio() {
  return readJson2("sociodemograficos.json");
}
function loadIndicadoresDemo() {
  return readJson2("demo-sintetico.json");
}
function loadIndicadoresGeo() {
  return readJson2("geometria.json");
}
function ubigeoDe(f) {
  const p = f.properties ?? {};
  return typeof p["ubigeo"] === "string" ? p["ubigeo"] : "";
}
function joinIndicadores(features, tabla) {
  return features.map((f) => ({
    ...f,
    properties: {
      ...f.properties ?? {},
      indicadores: tabla.registros[ubigeoDe(f)] ?? null
    }
  }));
}
function coberturaIndicadores(features, tabla) {
  const conDatos = features.filter((f) => tabla.registros[ubigeoDe(f)] !== void 0).length;
  return { total: features.length, conDatos, pct: features.length === 0 ? 0 : conDatos / features.length };
}

// src/geo.ts
function bboxDe(coords) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const walk = (c) => {
    if (Array.isArray(c) && typeof c[0] === "number" && typeof c[1] === "number") {
      minX = Math.min(minX, c[0]);
      minY = Math.min(minY, c[1]);
      maxX = Math.max(maxX, c[0]);
      maxY = Math.max(maxY, c[1]);
      return;
    }
    if (Array.isArray(c)) for (const v of c) walk(v);
  };
  walk(coords);
  return Number.isFinite(minX) ? [minX, minY, maxX, maxY] : null;
}
function puntoEnAnillo(anillo, p) {
  let dentro = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const xi = anillo[i][0];
    const yi = anillo[i][1];
    const xj = anillo[j][0];
    const yj = anillo[j][1];
    if (yi === p.lat && xi === p.lng) return true;
    if (yj === p.lat && xj === p.lng) return true;
    if (yi > p.lat !== yj > p.lat && p.lng < (xj - xi) * (p.lat - yi) / (yj - yi) + xi) {
      dentro = !dentro;
    }
  }
  return dentro;
}
function puntoEnPoligono(geom, p) {
  const polys = geom.type === "MultiPolygon" ? geom.coordinates : [geom.coordinates];
  return polys.some((poly) => {
    const [exterior, ...huecos] = poly;
    if (!puntoEnAnillo(exterior, p)) return false;
    return !huecos.some((h) => puntoEnAnillo(h, p));
  });
}
function propsDe2(f) {
  return f.properties ?? {};
}
function nivelDe(ubigeo) {
  if (ubigeo.length <= 2) return "departamental";
  if (ubigeo.length <= 4) return "provincial";
  return "distrital";
}
function reverseGeocode(features, punto, opciones) {
  const fallback = opciones?.fallback ?? null;
  for (const f of features) {
    const g = f.geometry;
    if (!g || g.type !== "Polygon" && g.type !== "MultiPolygon") continue;
    const bb = f.bbox ?? bboxDe(g.coordinates);
    if (bb && (punto.lng < bb[0] || punto.lng > bb[2] || punto.lat < bb[1] || punto.lat > bb[3])) {
      continue;
    }
    if (puntoEnPoligono(g, punto)) {
      const ub = String(propsDe2(f)["ubigeo"] ?? "");
      return { ubigeo: ub, nivel: nivelDe(ub), properties: f.properties, exacto: true };
    }
  }
  if (fallback === "mas-cercano" && opciones?.centroides) {
    let mejor = null;
    let mejorD = Infinity;
    for (const [ub, [x, y]] of Object.entries(opciones.centroides)) {
      const d = (x - punto.lng) ** 2 + (y - punto.lat) ** 2;
      if (d < mejorD) {
        mejorD = d;
        mejor = ub;
      }
    }
    if (mejor) {
      const f = features.find((x) => String(propsDe2(x)["ubigeo"]) === mejor);
      return {
        ubigeo: mejor,
        nivel: nivelDe(mejor),
        properties: f?.properties ?? {},
        exacto: false
      };
    }
  }
  return null;
}
var CONECTORES = /* @__PURE__ */ new Set(["de", "del", "la", "el", "los", "las", "y", "e", "en", "al"]);
var ROMANOS = /* @__PURE__ */ new Set([
  "i",
  "ii",
  "iii",
  "iv",
  "v",
  "vi",
  "vii",
  "viii",
  "ix",
  "x",
  "xi",
  "xii",
  "xiii",
  "xiv",
  "xv",
  "xvi",
  "xvii",
  "xviii",
  "xix",
  "xx"
]);
function dataDir3() {
  const here = path3__default.default.dirname(url.fileURLToPath((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('index.cjs', document.baseURI).href))));
  return path3__default.default.resolve(here, "..", "data");
}
async function loadNombres() {
  const base = path3__default.default.join(dataDir3(), "nombres");
  const sobre = JSON.parse(await fs.promises.readFile(path3__default.default.join(base, "sobreescrituras.json"), "utf-8"));
  const gent = JSON.parse(await fs.promises.readFile(path3__default.default.join(base, "gentilicios.json"), "utf-8"));
  delete gent["_nota"];
  return { sobreescrituras: sobre.sobreescrituras, gentilicios: gent };
}
function aNombreOficial(minusculas, overrides) {
  const clave = minusculas.trim().toLowerCase().replace(/\s+/g, " ");
  if (overrides?.[clave] !== void 0) return overrides[clave];
  return clave.split(" ").map((w, i) => {
    if (ROMANOS.has(w)) return w.toUpperCase();
    if (i > 0 && CONECTORES.has(w)) return w;
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(" ");
}
function gentilicio(nombreMinusculas, mapa) {
  if (!mapa) return null;
  const clave = nombreMinusculas.trim().toLowerCase().replace(/\s+/g, " ");
  return mapa[clave] ?? null;
}
function dataDir4() {
  const here = path3__default.default.dirname(url.fileURLToPath((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('index.cjs', document.baseURI).href))));
  return path3__default.default.resolve(here, "..", "data");
}
async function loadEquivalencias() {
  const raw = await fs.promises.readFile(path3__default.default.join(dataDir4(), "equivalencias", "ubigeo-2007-2026.json"), "utf-8");
  return JSON.parse(raw);
}
function cruceUbigeo(tabla, ubigeo, lado) {
  const clave = lado === "2007" ? "ubigeo_2007" : "ubigeo_2026";
  return tabla.filas.find((fila) => fila[clave] === ubigeo) ?? null;
}
function ubigeoEquivalente(tabla, ubigeo, desde) {
  const encontrada = cruceUbigeo(tabla, ubigeo, desde);
  if (!encontrada || encontrada.tipo === "creado" || encontrada.tipo === "sin_par_2026") return null;
  return desde === "2007" ? encontrada.ubigeo_2026 : encontrada.ubigeo_2007;
}
function contenedorGeometrico(tabla, ubigeo2026) {
  const encontrada = cruceUbigeo(tabla, ubigeo2026, "2026");
  if (!encontrada || encontrada.tipo !== "creado") return null;
  return encontrada.contenedor_2007;
}
function cambiosUbigeo(tabla) {
  return tabla.filas.filter((fila) => fila.tipo !== "estable");
}
function dataDir5() {
  const here = path3__default.default.dirname(url.fileURLToPath((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('index.cjs', document.baseURI).href))));
  return path3__default.default.resolve(here, "..", "data");
}
async function loadEspacialDistritos() {
  const raw = await fs.promises.readFile(path3__default.default.join(dataDir5(), "espacial", "distritos.json"), "utf-8");
  return JSON.parse(raw);
}
function registroEspacial(tabla, ubigeo) {
  return tabla.distritos[ubigeo] ?? null;
}
function vecinosDe(tabla, ubigeo) {
  return tabla.distritos[ubigeo]?.vecinos ?? [];
}
function altitudCentroide(tabla, ubigeo) {
  const valor = tabla.distritos[ubigeo]?.altitud_centroide_m;
  return valor === void 0 ? null : valor;
}

exports.ATRIBUCION = ATRIBUCION;
exports.LICENCIA_DATOS = LICENCIA_DATOS;
exports.LICENCIA_DATOS_URL = LICENCIA_DATOS_URL;
exports.aNombreOficial = aNombreOficial;
exports.altitudCentroide = altitudCentroide;
exports.buscarPorNombre = buscarPorNombre;
exports.cambiosUbigeo = cambiosUbigeo;
exports.coberturaIndicadores = coberturaIndicadores;
exports.contenedorGeometrico = contenedorGeometrico;
exports.cruceUbigeo = cruceUbigeo;
exports.esUbigeoValido = esUbigeoValido;
exports.filtrarFeatures = filtrarFeatures;
exports.gentilicio = gentilicio;
exports.joinIndicadores = joinIndicadores;
exports.loadCapitales = loadCapitales;
exports.loadDepartamental = loadDepartamental;
exports.loadDistrital = loadDistrital;
exports.loadEquivalencias = loadEquivalencias;
exports.loadEspacialDistritos = loadEspacialDistritos;
exports.loadIndicadoresDemo = loadIndicadoresDemo;
exports.loadIndicadoresGeo = loadIndicadoresGeo;
exports.loadIndicadoresSocio = loadIndicadoresSocio;
exports.loadNivel = loadNivel;
exports.loadNombres = loadNombres;
exports.loadProvincial = loadProvincial;
exports.loadStats = loadStats;
exports.loadUbigeoIndex = loadUbigeoIndex;
exports.nivelDeUbigeo = nivelDeUbigeo;
exports.normalizarTexto = normalizarTexto;
exports.perteneceA = perteneceA;
exports.puntoEnAnillo = puntoEnAnillo;
exports.puntoEnPoligono = puntoEnPoligono;
exports.registroEspacial = registroEspacial;
exports.reverseGeocode = reverseGeocode;
exports.ubigeoEquivalente = ubigeoEquivalente;
exports.ubigeoPadre = ubigeoPadre;
exports.vecinosDe = vecinosDe;
