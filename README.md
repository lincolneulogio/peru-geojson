# peru-geojson

Polígonos de departamentos, provincias y distritos del Perú, en GeoJSON (RFC 7946, WGS84 / EPSG:4326).

Hay dos generaciones en el mismo repositorio:

- **Raíz, sin cambios.** Los cuatro archivos históricos siguen igual, con sus propiedades originales.
- **Canónico.** Límites releídos del IDE-INEI (descarga del 6 de marzo de 2026; el portal los publica como actualizados al 2023). Nombres normalizados, `bbox`, sin miembro `crs` legacy, y los nombres viejos conservados como alias.

## Archivos históricos

| Archivo | Qué es |
| --- | --- |
| `peru_departamental_simple.geojson` | 25 departamentos. INEI-2007, simplificado. |
| `peru_provincial_simple.geojson` | Provincias. INEI-2007, simplificado. |
| `peru_distrital_simple.geojson` | Distritos. INEI-2007, simplificado. |
| `peru_capital_provincia.geojson` | Puntos de capital de provincia. IDEP-2016. |

Esos archivos siguen usando `NOMBDEP`, `FIRST_IDDP`, `NOMBPROV`, `FIRST_IDPR`, `NOMBDIST`, `IDDIST` y `NOM_CAP`. Varios traen un `crs` anterior a RFC 7946 (`CRS84`, equivalente a WGS84).

## Archivos canónicos

| Archivo | Uso |
| --- | --- |
| `data/validated/peru-departamental.validated.geojson` | 25 departamentos, con alias legacy. |
| `data/validated/peru-provincial.validated.geojson` | 196 provincias. |
| `data/validated/peru-distrital.validated.geojson` | 1890 distritos. |
| `data/validated/peru-capitales.validated.geojson` | Puntos IDEP-2016, unidos al ubigeo provincial. |
| `data/derived/peru-*.min.geojson` | Solo campos canónicos, coordenadas a 6 decimales. |
| `data/derived/peru-*.preview.geojson` | Misma tabla, geometría más liviana (0.005°). |
| `data/derived/peru-*.topojson` | TopoJSON del archivo min, cuantización 1e6. |
| `data/variants/light/*.geojson` | Variante móvil: menos vértices y 4 decimales. |
| `data/variants/peru.topojson` | TopoJSON cuantizado, cerca de 80% más liviano que el validado. |
| `data/variants/peru-ubigeo.pmtiles` | Teselas vectoriales para la web. |
| `data/ubigeo.json` | Índice sin geometría: ubigeo, nombres, capital, bbox y alias. |
| `data/equivalencias/ubigeo-2007-2026.json` | Cruce completo INEI-2007 ↔ catálogo canónico. |
| `data/equivalencias/cambios-2007-2026.csv` | Solo las filas que no son `estable`. |
| `data/espacial/distritos.json` | Centroide, bbox, altitud del centroide y vecinos por distrito. |
| `data/validated/reporte.json` | Conteo de la normalización. |

`bbox` nacional de los polígonos departamentales: `[-81.328195, -18.350928, -68.652279, -0.038606]` (oeste, sur, este, norte).

CRS: **EPSG:4326**. No se escribe el miembro `crs`; RFC 7946 asume WGS84. El GPKG de origen ya venía en 4326, así que no hubo reproyección. El detalle del método está en [docs/TRANSFORMACION.md](docs/TRANSFORMACION.md).

La geometría publicada está simplificada con Douglas-Peucker a 0.0005° (cerca de 55 m) para poder versionarla y usarla en la web. No reemplaza un límite catastral.

## Campos

En todos los niveles los nombres canónicos van en minúsculas, sin tildes. Si el nivel no tiene ese nombre, el campo es `""`. No hay `null`.

| Campo | Departamento | Provincia | Distrito |
| --- | --- | --- | --- |
| `ubigeo` | 2 dígitos (`15`) | 4 (`1501`) | 6 (`150101`) |
| `nombre_departamento` | `lima` | `lima` | `lima` |
| `nombre_provincia` | `""` | `lima` | `lima` |
| `nombre_distrito` | `""` | `""` | `lima` |
| `capital` | sede departamental | capital provincial | `NOM_CAP` histórico, si el ubigeo existe |

Alias que siguen presentes en `*.validated.geojson` (no en los `.min`):

| Alias | Proviene de |
| --- | --- |
| `NOMBDEP`, `FIRST_IDDP` | departamento |
| `NOMBPROV`, `FIRST_IDPR`, `FIRST_NOMB` | provincia |
| `NOMBDIST`, `IDDIST`, `IDDPTO`, `IDPROV`, `NOM_CAP` | distrito |

Ejemplo de departamento:

```json
{
  "type": "Feature",
  "id": "15",
  "properties": {
    "ubigeo": "15",
    "nombre_departamento": "lima",
    "nombre_provincia": "",
    "nombre_distrito": "",
    "capital": "lima",
    "NOMBDEP": "LIMA",
    "FIRST_IDDP": "15"
  }
}
```

Los tipos TypeScript están en [`types/Ubigeo.ts`](types/Ubigeo.ts).

El GPKG oficial no trae capital. Las de departamento son la sede conocida; las de provincia salen del punto IDEP-2016 (con tres abreviaturas resueltas y dos provincias que ese archivo no trae); las de distrito, del `NOM_CAP` histórico cuando el ubigeo coincide. En esta generación, 58 distritos quedan con `capital` vacío. El cruce los explica: 56 creados después del extracto 2007 y 2 reasignados a la provincia Putumayo. No se rellenó a mano distrito por distrito.

## Series 2007–2026, altitud y vecinos

`data/equivalencias/ubigeo-2007-2026.json` es el cruce completo (departamentos, provincias y distritos). `cambios-2007-2026.csv` deja solo lo que no es `estable`. El lado 2026 es este catálogo (descarga del 6 de marzo de 2026; el portal dice actualización 2023), no un padrón legal de 2026.

| `tipo` | Qué significa para una serie |
| --- | --- |
| `estable` | Mismo código y mismos nombres. El join es directo. |
| `renombrado` | Mismo código, cambió el nombre (por ejemplo Magdalena Vieja → Pueblo Libre, `150121`). |
| `reasignado` | Mismo distrito, otro código. Putumayo `160109` → `160801`. |
| `creado` | No hay código 2007. `contenedor_2007` es el polígono de 2007 que contiene el centroide: agrega la serie, no cita el decreto. |

`data/espacial/distritos.json` junta, por distrito, el centroide (el de `indicadores/geometria.json`), el `bbox`, la altitud del centroide en Copernicus DEM GLO-90 y la lista de vecinos por frontera compartida. La Punta limita con Callao. Amantaní y Anapia no tienen vecino terrestre.

Regenerar:

```bash
python scripts/equivalencias_ubigeo.py
python scripts/espacial_distrito.py
node scripts/sync-package-data.mjs
```

## Python

El paquete `python/` se importa como `peru_geojson` y lee el mismo `ubigeo.json`. Con GeoPandas: `pip install "peru-geojson[gis]"` y `a_geodataframe("distrital")`. El mapa de nombres con la librería TypeScript está en [python/README.md](python/README.md).

## Leaflet

```html
<div id="mapa" style="height: 480px"></div>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  const mapa = L.map("mapa").fitBounds([[-18.350928, -81.328195], [-0.038606, -68.652279]]);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap &copy; CARTO"
  }).addTo(mapa);

  fetch("data/derived/peru-departamental.min.geojson")
    .then((respuesta) => respuesta.json())
    .then((datos) => {
      L.geoJSON(datos, {
        style: { color: "#134e4a", weight: 1, fillColor: "#0f766e", fillOpacity: 0.35 },
        onEachFeature: (feature, capa) => {
          const p = feature.properties;
          capa.bindPopup(`${p.nombre_departamento} · ${p.ubigeo}`);
        }
      }).addTo(mapa);
    });
</script>
```

## MapLibre GL

```html
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.css" />
<script src="https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.js"></script>
<div id="mapa" style="height: 480px"></div>
<script>
  const mapa = new maplibregl.Map({
    container: "mapa",
    style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    bounds: [[-81.328195, -18.350928], [-68.652279, -0.038606]],
    fitBoundsOptions: { padding: 24 }
  });

  mapa.on("load", async () => {
    const datos = await fetch("data/derived/peru-departamental.min.geojson").then((r) => r.json());
    mapa.addSource("peru", { type: "geojson", data: datos });
    mapa.addLayer({
      id: "peru",
      type: "fill",
      source: "peru",
      paint: { "fill-color": "#0f766e", "fill-opacity": 0.4 }
    });
  });
</script>
```

TopoJSON, si hace falta compartir aristas:

```js
import { feature } from "topojson-client";
const topo = await fetch("data/derived/peru-provincial.topojson").then((r) => r.json());
const provincias = feature(topo, topo.objects.peru);
```

## Visor y API

Una sola aplicación Next.js en `web/` (App Router, Tailwind, modo oscuro). Es la que construye el CI. El mapa conmuta entre **MapLibre** y **Leaflet** sin cambiar la API ni el catálogo.

```bash
pnpm install
pnpm --filter peru-geojson-visor dev
```

El selector baja de departamento a provincia y a distrito. La búsqueda acepta ubigeo o nombre. La descarga devuelve solo el ámbito visible. En `/pintar` se pega un CSV de ubigeos y el mapa se colorea con las teselas PMTiles.

## PMTiles en el CDN

El archivo `data/variants/peru-ubigeo.pmtiles` (MVT, zooms 0–10, capas `departamentos`, `provincias` y `distritos`, campos `ubigeo` y `nombre`) se publica en dos sitios:

| Dónde | URL |
| --- | --- |
| App (Range) | `/pmtiles` |
| jsDelivr | `https://cdn.jsdelivr.net/gh/lincolneulogio/peru-geojson@master/data/variants/peru-ubigeo.pmtiles` |

jsDelivr responde `Range`, que es lo que exige el protocolo. El sha256 del archivo está en `data/v2023/MANIFEST.json`.

```html
<script src="https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.js"></script>
<script src="https://unpkg.com/pmtiles@4/dist/pmtiles.js"></script>
<script>
  const protocolo = new pmtiles.Protocol();
  maplibregl.addProtocol("pmtiles", protocolo.tile);
  const mapa = new maplibregl.Map({
    container: "mapa",
    style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    bounds: [[-81.328195, -18.350928], [-68.652279, -0.038606]]
  });
  mapa.on("load", () => {
    mapa.addSource("peru", {
      type: "vector",
      url: "pmtiles://https://cdn.jsdelivr.net/gh/lincolneulogio/peru-geojson@master/data/variants/peru-ubigeo.pmtiles"
    });
    mapa.addLayer({ id: "dep", type: "fill", source: "peru", "source-layer": "departamentos", paint: { "fill-color": "#0f766e", "fill-opacity": 0.45 } });
  });
</script>
```

## Versiones anuales

El INEI actualiza los límites. Cada edición queda en `data/vYYYY/MANIFEST.json` con el sha256 de los GeoJSON, TopoJSON, PMTiles y el índice. Los bytes siguen en las rutas canónicas: son la edición vigente. El catálogo está en `data/versiones.json` (`actual` hoy es `2023`).

```bash
python scripts/congelar_version.py --comprobar
python scripts/congelar_version.py --actualizar
```

`--comprobar` es el paso del CI. Si los bytes cambian, el pin no se reescribe solo: hay que pasar `--actualizar` en el mismo año, o publicar `data/v2024` cuando el reporte de normalización declare límites de 2024 (`--establecer-actual` mueve `actual`).

| Ruta | Respuesta |
| --- | --- |
| `GET /api/versiones` | Catálogo de ediciones |
| `GET /api/versiones/2023` | Manifiesto con sha256 |
| `GET /pintar` | Playground: CSV de ubigeos sobre PMTiles |

La API del catálogo:

| Ruta | Respuesta |
| --- | --- |
| `GET /api/departamentos` | 25 departamentos, sin geometría |
| `GET /api/provincias?dep=15` | Provincias de ese departamento |
| `GET /api/distritos?prov=1501` | Distritos de esa provincia |
| `GET /api/distritos?dep=15` | Distritos del departamento |
| `GET /api/ubigeo?q=150101` | Búsqueda por código o nombre |
| `GET /api/geo/departamentos` | GeoJSON para el mapa |
| `GET /api/geo/provincias?dep=15` | Provincias de Lima, con geometría |
| `GET /api/geo/distritos?prov=1501` | Distritos, con geometría |
| `GET /api/descarga?nivel=distrital&ubigeo=1501` | Archivo filtrado |

Cada listado usa el formato de API Resource: `{ data, meta }`. `meta` trae `total`, `fuente` y `crs`.

## Regenerar y validar

Hace falta volver a bajar los `.rar` solo si vas a regenerar. La validación de lo ya publicado no los necesita. El procedimiento está en [docs/TRANSFORMACION.md](docs/TRANSFORMACION.md).

```bash
pnpm install
pnpm datos
```

Eso normaliza, escribe TopoJSON y corre la validación. Por separado:

```bash
pnpm normalize
pnpm derive
pnpm validate
```

`validate_geojson.py` revisa el contrato (ubigeo único, anillos cerrados, `bbox`, sin `crs`) y, con las dependencias de Node instaladas, pasa cada archivo por `@mapbox/geojsonhint`.

GitHub Actions (`.github/workflows/validar.yml`) hace esa validación, comprueba el pin `data/v2023` y además `tsc` y `next build` del visor en cada pull request.

## Licencia

Los datos (GeoJSON, TopoJSON, PMTiles y catálogos) están bajo [CC BY 4.0](LICENSE-DATA). Hay que atribuir al INEI (límites IDE-INEI, actualización 2023) y al IDEP (capitales de provincia, 2016).

El código del visor, los scripts y el paquete TypeScript están bajo [MIT](LICENSE).

## Variantes y Shapefile

```bash
pnpm variants
pnpm --filter peru-geojson shapefile -- --input limite.shp --nivel distrital --output salida.geojson
pnpm --filter peru-geojson shapefile -- --input limite.shp --list-fields
```

`pnpm variants` lee los preview y escribe `data/variants/`: GeoJSON light, un TopoJSON y un PMTiles. El visor en `web/` usa el light si existe y, si no, el preview. El playground `/pintar` usa el PMTiles.
