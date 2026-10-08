import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  aNombreOficial,
  buscarPorNombre,
  coberturaIndicadores,
  esUbigeoValido,
  filtrarFeatures,
  gentilicio,
  joinIndicadores,
  nivelDeUbigeo,
  normalizarTexto,
  perteneceA,
  reverseGeocode,
  ubigeoPadre,
} from "../dist/index.js";

const dataUrl = (f) => new URL(`../data/${f}`, import.meta.url);
const leer = (f) => JSON.parse(readFileSync(fileURLToPath(dataUrl(f)), "utf-8"));

describe("ubigeo", () => {
  it("valida longitudes 2/4/6", () => {
    assert.equal(esUbigeoValido("15"), true);
    assert.equal(esUbigeoValido("1501"), true);
    assert.equal(esUbigeoValido("150137"), true);
    assert.equal(esUbigeoValido("15013"), false);
    assert.equal(esUbigeoValido("AB"), false);
  });

  it("detecta nivel y padre", () => {
    assert.equal(nivelDeUbigeo("15"), "departamental");
    assert.equal(nivelDeUbigeo("1501"), "provincial");
    assert.equal(nivelDeUbigeo("150137"), "distrital");
    assert.equal(ubigeoPadre("150137"), "1501");
    assert.equal(ubigeoPadre("1501"), "15");
    assert.equal(ubigeoPadre("15"), null);
  });

  it("perteneceA respeta jerarquía", () => {
    assert.equal(perteneceA("150137", "15"), true);
    assert.equal(perteneceA("150137", "1501"), true);
    assert.equal(perteneceA("1501", "150137"), false);
  });

  it("normaliza tildes y mayúsculas", () => {
    assert.equal(normalizarTexto("SAN MARTÍN  De Porres"), "san martin de porres");
  });
});

describe("search (esquema nombre_*)", () => {
  const features = [
    { type: "Feature", properties: { ubigeo: "15", nombre_departamento: "lima" }, geometry: null },
    { type: "Feature", properties: { ubigeo: "07", nombre_departamento: "callao" }, geometry: null },
  ];

  it("filtra por prefijo dep y por texto", () => {
    assert.equal(filtrarFeatures(features, { nivel: "departamental", dep: "15" }).length, 1);
    assert.equal(buscarPorNombre(features, "callao", "departamental").length, 1);
    assert.equal(buscarPorNombre(features, "cusco", "departamental").length, 0);
  });
});

describe("datos sincronizados (IDE-INEI 2023)", () => {
  it("conteos oficiales 25/196/1890/194", () => {
    assert.equal(leer("peru-departamental.min.geojson").features.length, 25);
    assert.equal(leer("peru-provincial.min.geojson").features.length, 196);
    assert.equal(leer("peru-distrital.min.geojson").features.length, 1890);
    assert.equal(leer("peru-capitales.min.geojson").features.length, 194);
  });

  it("índice ubigeo.json consistente", () => {
    const idx = leer("ubigeo.json");
    assert.equal(idx.departamentos.length, 25);
    assert.equal(idx.provincias.length, 196);
    assert.equal(idx.distritos.length, 1890);
  });
});

describe("indicadores (left join honesto)", () => {
  const features = [
    { type: "Feature", properties: { ubigeo: "150101" }, geometry: null },
    { type: "Feature", properties: { ubigeo: "150102" }, geometry: null },
  ];
  const tabla = {
    meta: { estado: "demo-sintetico" },
    registros: { 150101: { poblacion: 1000, hogares: 300 } },
  };

  it("une sin mutar y deja null donde no hay dato", () => {
    const unido = joinIndicadores(features, tabla);
    assert.equal(features[0].properties.indicadores, undefined);
    assert.equal(unido[0].properties.indicadores.poblacion, 1000);
    assert.equal(unido[1].properties.indicadores, null);
  });

  it("mide cobertura", () => {
    assert.deepEqual(coberturaIndicadores(features, tabla), { total: 2, conDatos: 1, pct: 0.5 });
  });

  it("geometría real: Cercado de Lima ≈ 21.6 km²", () => {
    const geo = leer("indicadores/geometria.json");
    const lima = geo.niveles.distrital["150101"];
    assert.ok(Math.abs(lima.area_km2 - 21.6) < 1.5);
    assert.deepEqual(leer("indicadores/sociodemograficos.json").registros, {});
  });
});

describe("geocodificación inversa", () => {
  const distrital = leer("peru-distrital.min.geojson").features;

  it("Plaza de Armas de Lima cae en Lima cercado", () => {
    const r = reverseGeocode(distrital, { lng: -77.0318, lat: -12.0458 });
    assert.ok(r && r.exacto);
    assert.ok(r.ubigeo.startsWith("1501"));
  });

  it("punto en el mar retorna null sin fallback", () => {
    const r = reverseGeocode(distrital, { lng: -90, lat: -20 });
    assert.equal(r, null);
  });
});

describe("nombres oficiales", () => {
  const overrides = leer("nombres/sobreescrituras.json").sobreescrituras;
  const gent = leer("nombres/gentilicios.json");

  it("override verificado gana", () => {
    assert.equal(aNombreOficial("san martin de porres", overrides), "San Martín de Porres");
    assert.equal(aNombreOficial("ancash", overrides), "Áncash");
  });

  it("reglas: conectores y romanos", () => {
    assert.equal(aNombreOficial("santa rosa de lima", {}), "Santa Rosa de Lima");
    assert.equal(aNombreOficial("carmen de la legua reynoso", {}), "Carmen de la Legua Reynoso");
  });

  it("gentilicio verificado o null, nunca inventa", () => {
    assert.equal(gentilicio("lima", gent), "limeño");
    assert.equal(gentilicio("madre de dios", gent), null);
    assert.equal(gentilicio("inventado", gent), null);
  });
});
