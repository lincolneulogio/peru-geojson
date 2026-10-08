'use strict';

var fs = require('fs');
var path = require('path');
var url = require('url');

var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var path__default = /*#__PURE__*/_interopDefault(path);

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
  const here = path__default.default.dirname(url.fileURLToPath((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('index.cjs', document.baseURI).href))));
  return path__default.default.resolve(here, "..", "data");
}
async function readJson(file) {
  const raw = await fs.promises.readFile(path__default.default.join(dataDir(), file), "utf-8");
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

exports.ATRIBUCION = ATRIBUCION;
exports.LICENCIA_DATOS = LICENCIA_DATOS;
exports.LICENCIA_DATOS_URL = LICENCIA_DATOS_URL;
exports.buscarPorNombre = buscarPorNombre;
exports.esUbigeoValido = esUbigeoValido;
exports.filtrarFeatures = filtrarFeatures;
exports.loadCapitales = loadCapitales;
exports.loadDepartamental = loadDepartamental;
exports.loadDistrital = loadDistrital;
exports.loadNivel = loadNivel;
exports.loadProvincial = loadProvincial;
exports.loadStats = loadStats;
exports.loadUbigeoIndex = loadUbigeoIndex;
exports.nivelDeUbigeo = nivelDeUbigeo;
exports.normalizarTexto = normalizarTexto;
exports.perteneceA = perteneceA;
exports.ubigeoPadre = ubigeoPadre;
