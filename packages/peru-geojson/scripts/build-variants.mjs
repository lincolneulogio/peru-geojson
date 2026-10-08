import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { topology } from "topojson-server";
import geojsonvt from "geojson-vt";
import vtpbf from "vt-pbf";
import { idDeTesela, lonLatATesela, escribirPmtiles } from "./pmtiles-v3.mjs";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const salida = path.join(raiz, "data", "variants");
const lightDir = path.join(salida, "light");

const ATRIBUCION =
  "Instituto Nacional de Estadística e Informática (INEI). Límites departamentales, provinciales y distritales: IDE-INEI, actualización 2023. Capitales de provincia: Infraestructura de Datos Espaciales del Perú (IDEP), 2016.";

const NIVELES = [
  {
    id: "departamentos",
    origen: "data/derived/peru-departamental.preview.geojson",
    referencia: "data/validated/peru-departamental.validated.geojson",
    epsilon: 0.012,
    decimales: 4,
    minZoom: 0,
    maxZoom: 7,
  },
  {
    id: "provincias",
    origen: "data/derived/peru-provincial.preview.geojson",
    referencia: "data/validated/peru-provincial.validated.geojson",
    epsilon: 0.006,
    decimales: 4,
    minZoom: 4,
    maxZoom: 9,
  },
  {
    id: "distritos",
    origen: "data/derived/peru-distrital.preview.geojson",
    referencia: "data/validated/peru-distrital.validated.geojson",
    epsilon: 0.0028,
    decimales: 4,
    minZoom: 7,
    maxZoom: 10,
  },
  {
    id: "capitales",
    origen: "data/derived/peru-capitales.preview.geojson",
    referencia: "data/validated/peru-capitales.validated.geojson",
    epsilon: 0,
    decimales: 5,
    minZoom: 0,
    maxZoom: 0,
  },
];

function distancia(punto, inicio, fin) {
  const dx = fin[0] - inicio[0];
  const dy = fin[1] - inicio[1];
  if (dx === 0 && dy === 0) {
    return Math.hypot(punto[0] - inicio[0], punto[1] - inicio[1]);
  }
  return Math.abs(dy * punto[0] - dx * punto[1] + fin[0] * inicio[1] - fin[1] * inicio[0]) / Math.hypot(dx, dy);
}

function douglasPeucker(puntos, epsilon) {
  const total = puntos.length;
  if (total < 3 || epsilon <= 0) {
    return puntos.map((punto) => punto.slice());
  }
  const conservar = new Uint8Array(total);
  conservar[0] = 1;
  conservar[total - 1] = 1;
  const pila = [[0, total - 1]];
  while (pila.length > 0) {
    const tramo = pila.pop();
    if (!tramo) continue;
    const [inicio, fin] = tramo;
    let maximo = 0;
    let indice = -1;
    for (let i = inicio + 1; i < fin; i += 1) {
      const actual = puntos[i];
      const a = puntos[inicio];
      const b = puntos[fin];
      if (!actual || !a || !b) continue;
      const valor = distancia(actual, a, b);
      if (valor > maximo) {
        maximo = valor;
        indice = i;
      }
    }
    if (indice !== -1 && maximo > epsilon) {
      conservar[indice] = 1;
      pila.push([inicio, indice], [indice, fin]);
    }
  }
  const resultado = [];
  for (let i = 0; i < total; i += 1) {
    if (conservar[i]) {
      const punto = puntos[i];
      if (punto) resultado.push(punto.slice());
    }
  }
  return resultado;
}

function redondearPunto(punto, decimales) {
  const factor = 10 ** decimales;
  return punto.map((valor) => Math.round(valor * factor) / factor);
}

function simplificarAnillo(anillo, epsilon, decimales) {
  const abierto = anillo.length > 1 && mismoPunto(anillo[0], anillo[anillo.length - 1]) ? anillo.slice(0, -1) : anillo.slice();
  const reducido = douglasPeucker(abierto, epsilon).map((punto) => redondearPunto(punto, decimales));
  if (reducido.length < 3) {
    const respaldo = anillo.map((punto) => redondearPunto(punto, decimales));
    return respaldo;
  }
  const primero = reducido[0];
  const ultimo = reducido[reducido.length - 1];
  if (primero && ultimo && !mismoPunto(primero, ultimo)) {
    reducido.push(primero.slice());
  }
  return reducido.length >= 4 ? reducido : anillo.map((punto) => redondearPunto(punto, decimales));
}

function mismoPunto(a, b) {
  if (!a || !b) return false;
  return a[0] === b[0] && a[1] === b[1];
}

function simplificarGeometria(geometria, epsilon, decimales) {
  if (geometria.type === "Point") {
    return { type: "Point", coordinates: redondearPunto(geometria.coordinates, decimales) };
  }
  if (geometria.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: geometria.coordinates
        .map((anillo) => simplificarAnillo(anillo, epsilon, decimales))
        .filter((anillo) => anillo.length >= 4),
    };
  }
  if (geometria.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geometria.coordinates
        .map((poligono) => poligono.map((anillo) => simplificarAnillo(anillo, epsilon, decimales)).filter((anillo) => anillo.length >= 4))
        .filter((poligono) => poligono.length > 0),
    };
  }
  return geometria;
}

function recorrer(coordenadas, visitar) {
  if (!Array.isArray(coordenadas) || coordenadas.length === 0) return;
  if (typeof coordenadas[0] === "number") {
    visitar(coordenadas[0], coordenadas[1]);
    return;
  }
  for (const parte of coordenadas) recorrer(parte, visitar);
}

function bboxDe(features) {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  for (const feature of features) {
    recorrer(feature.geometry?.coordinates, (lon, lat) => {
      minLon = Math.min(minLon, lon);
      minLat = Math.min(minLat, lat);
      maxLon = Math.max(maxLon, lon);
      maxLat = Math.max(maxLat, lat);
    });
  }
  return [minLon, minLat, maxLon, maxLat];
}

function nombreDe(nivel, propiedades) {
  if (nivel === "departamentos") return propiedades.nombre_departamento;
  if (nivel === "provincias") return propiedades.nombre_provincia;
  if (nivel === "distritos") return propiedades.nombre_distrito;
  return propiedades.capital;
}

function propiedadesPublicas(propiedades) {
  return {
    ubigeo: propiedades.ubigeo,
    nombre_departamento: propiedades.nombre_departamento,
    nombre_provincia: propiedades.nombre_provincia,
    nombre_distrito: propiedades.nombre_distrito,
    capital: propiedades.capital,
  };
}

function leerColeccion(relativo) {
  return JSON.parse(readFileSync(path.join(raiz, relativo), "utf8"));
}

function escribirJson(destino, valor) {
  writeFileSync(destino, JSON.stringify(valor));
}

function construirLight(nivel) {
  const coleccion = leerColeccion(nivel.origen);
  const features = [];
  for (const feature of coleccion.features) {
    const geometria = simplificarGeometria(feature.geometry, nivel.epsilon, nivel.decimales);
    const vacia =
      (geometria.type === "Polygon" && geometria.coordinates.length === 0) ||
      (geometria.type === "MultiPolygon" && geometria.coordinates.length === 0);
    if (vacia) continue;
    features.push({
      type: "Feature",
      id: String(feature.id ?? feature.properties.ubigeo),
      properties: propiedadesPublicas(feature.properties),
      geometry: geometria,
    });
  }
  features.sort((a, b) => String(a.id).localeCompare(String(b.id), "es"));
  return {
    type: "FeatureCollection",
    bbox: bboxDe(features),
    metadata: {
      variante: "light",
      licencia: "CC-BY-4.0",
      atribucion: ATRIBUCION,
      simplificacion_grados: nivel.epsilon,
      precision_decimales: nivel.decimales,
      generado_por: "peru-geojson/scripts/build-variants.mjs",
    },
    features,
  };
}

function paraTeselas(coleccion, nivel) {
  return {
    type: "FeatureCollection",
    features: coleccion.features.map((feature) => ({
      type: "Feature",
      properties: {
        ubigeo: feature.properties.ubigeo,
        nombre: nombreDe(nivel, feature.properties),
      },
      geometry: feature.geometry,
    })),
  };
}

function rangoTeselas(bbox, zoom) {
  const noroeste = lonLatATesela(bbox[0], bbox[3], zoom);
  const sureste = lonLatATesela(bbox[2], bbox[1], zoom);
  return {
    x0: Math.min(noroeste.x, sureste.x),
    x1: Math.max(noroeste.x, sureste.x),
    y0: Math.min(noroeste.y, sureste.y),
    y1: Math.max(noroeste.y, sureste.y),
  };
}

function construirPmtiles(colecciones) {
  const indices = {
    departamentos: new geojsonvt(paraTeselas(colecciones.departamentos, "departamentos"), {
      maxZoom: 7,
      indexMaxZoom: 4,
      tolerance: 3,
      extent: 4096,
      buffer: 64,
    }),
    provincias: new geojsonvt(paraTeselas(colecciones.provincias, "provincias"), {
      maxZoom: 9,
      indexMaxZoom: 5,
      tolerance: 3,
      extent: 4096,
      buffer: 64,
    }),
    distritos: new geojsonvt(paraTeselas(colecciones.distritos, "distritos"), {
      maxZoom: 10,
      indexMaxZoom: 5,
      tolerance: 3,
      extent: 4096,
      buffer: 64,
    }),
  };
  const limites = {
    departamentos: 7,
    provincias: 9,
    distritos: 10,
  };
  const minimos = { departamentos: 0, provincias: 4, distritos: 7 };
  const bbox = colecciones.departamentos.bbox;
  const pendientes = [];
  for (let zoom = 0; zoom <= 10; zoom += 1) {
    const rango = rangoTeselas(bbox, zoom);
    for (let x = rango.x0; x <= rango.x1; x += 1) {
      for (let y = rango.y0; y <= rango.y1; y += 1) {
        const capas = {};
        for (const nombre of ["departamentos", "provincias", "distritos"]) {
          if (zoom < minimos[nombre] || zoom > limites[nombre]) continue;
          const tesela = indices[nombre].getTile(zoom, x, y);
          if (tesela && tesela.features.length > 0) capas[nombre] = tesela;
        }
        if (Object.keys(capas).length === 0) continue;
        const mvt = Buffer.from(vtpbf.fromGeojsonVt(capas, { version: 2, extent: 4096 }));
        pendientes.push({ id: idDeTesela(zoom, x, y), gzip: gzipSync(mvt) });
      }
    }
  }
  pendientes.sort((a, b) => a.id - b.id);
  let desplazamiento = 0;
  const entradas = [];
  const blobs = [];
  for (const tesela of pendientes) {
    entradas.push({
      id: tesela.id,
      longitudRun: 1,
      bytes: tesela.gzip.length,
      desplazamiento,
    });
    blobs.push(tesela.gzip);
    desplazamiento += tesela.gzip.length;
  }
  return escribirPmtiles({
    entradas,
    blobs,
    minZoom: 0,
    maxZoom: 10,
    zoomCentro: 4,
    bbox,
    metadata: {
      name: "peru-ubigeo",
      license: "CC-BY-4.0",
      attribution: ATRIBUCION,
      vector_layers: [
        { id: "departamentos", fields: { ubigeo: "String", nombre: "String" }, minzoom: 0, maxzoom: 7 },
        { id: "provincias", fields: { ubigeo: "String", nombre: "String" }, minzoom: 4, maxzoom: 9 },
        { id: "distritos", fields: { ubigeo: "String", nombre: "String" }, minzoom: 7, maxzoom: 10 },
      ],
    },
  });
}

function reduccion(bytes, referencia) {
  if (!referencia) return null;
  return Number((1 - bytes / referencia).toFixed(4));
}

mkdirSync(lightDir, { recursive: true });
const colecciones = {};
const archivos = [];

for (const nivel of NIVELES) {
  const light = construirLight(nivel);
  colecciones[nivel.id] = light;
  const destino = path.join(lightDir, `${nivel.id}.geojson`);
  escribirJson(destino, light);
  const bytes = statSync(destino).size;
  const bytesReferencia = statSync(path.join(raiz, nivel.referencia)).size;
  archivos.push({
    id: `light-${nivel.id}`,
    descripcion: `GeoJSON light de ${nivel.id}`,
    ruta: path.relative(raiz, destino).replaceAll("\\", "/"),
    bytes,
    bytes_referencia: bytesReferencia,
    reduccion: reduccion(bytes, bytesReferencia),
  });
  console.log(`${nivel.id}: ${light.features.length} features, ${bytes} bytes`);
}

const topo = topology(
  {
    departamentos: colecciones.departamentos,
    provincias: colecciones.provincias,
    distritos: colecciones.distritos,
    capitales: colecciones.capitales,
  },
  1e4,
);
topo.metadata = {
  variante: "topojson",
  licencia: "CC-BY-4.0",
  atribucion: ATRIBUCION,
  cuantizacion: 1e4,
  objetos: ["departamentos", "provincias", "distritos", "capitales"],
  generado_por: "peru-geojson/scripts/build-variants.mjs",
};
const topoRuta = path.join(salida, "peru.topojson");
escribirJson(topoRuta, topo);
const topoBytes = statSync(topoRuta).size;
const referenciaPoligonos = ["departamentos", "provincias", "distritos"].reduce((suma, id) => {
  const item = archivos.find((archivo) => archivo.id === `light-${id}`);
  return suma + (item?.bytes_referencia ?? 0);
}, 0);
archivos.push({
  id: "topojson",
  descripcion: "TopoJSON cuantizado de departamentos, provincias, distritos y capitales",
  ruta: "data/variants/peru.topojson",
  bytes: topoBytes,
  bytes_referencia: referenciaPoligonos,
  reduccion: reduccion(topoBytes, referenciaPoligonos),
});
console.log(`topojson: ${topoBytes} bytes, reduccion ${reduccion(topoBytes, referenciaPoligonos)}`);

const pmtiles = construirPmtiles(colecciones);
const pmtilesRuta = path.join(salida, "peru-ubigeo.pmtiles");
writeFileSync(pmtilesRuta, pmtiles);
const pmtilesBytes = statSync(pmtilesRuta).size;
if (pmtiles.subarray(0, 7).toString("utf8") !== "PMTiles" || pmtiles[7] !== 3) {
  throw new Error("El PMTiles generado no tiene encabezado v3.");
}
archivos.push({
  id: "pmtiles",
  descripcion: "Teselas vectoriales PMTiles (MVT gzip, zooms 0-10)",
  ruta: "data/variants/peru-ubigeo.pmtiles",
  bytes: pmtilesBytes,
  bytes_referencia: referenciaPoligonos,
  reduccion: reduccion(pmtilesBytes, referenciaPoligonos),
});
console.log(`pmtiles: ${pmtilesBytes} bytes`);

const manifiesto = {
  generado_en: new Date().toISOString(),
  licencia: "CC-BY-4.0",
  licencia_url: "https://creativecommons.org/licenses/by/4.0/",
  atribucion: ATRIBUCION,
  archivos,
};
escribirJson(path.join(salida, "MANIFEST.json"), manifiesto);

const topoReduccion = manifiesto.archivos.find((archivo) => archivo.id === "topojson")?.reduccion ?? 0;
if (topoReduccion < 0.75) {
  throw new Error(`TopoJSON solo redujo ${topoReduccion}. Se esperaba al menos 75% frente al validado.`);
}
for (const archivo of archivos) {
  if (archivo.id.startsWith("light-") && archivo.id !== "light-capitales" && (archivo.reduccion ?? 0) <= 0) {
    throw new Error(`${archivo.id} no pesa menos que su referencia.`);
  }
}
console.log("variantes ok");
