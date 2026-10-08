# Método de transformación

Los GeoJSON de la raíz (`peru_*_simple.geojson` y `peru_capital_provincia.geojson`) no se modifican. El producto canónico se regenera desde los GeoPackage del portal IDE-INEI.

## Fuente

Portal: [ide.inei.gob.pe](https://ide.inei.gob.pe/), sección de descarga de límites (el portal los describe como actualizados al 2023).

Archivos usados en esta generación, con `Last-Modified: Fri, 06 Mar 2026`:

| Archivo | URL | Contenido |
| --- | --- | --- |
| Departamento.rar | https://ide.inei.gob.pe/files/Departamento.rar | `DEPARTAMENTO.gpkg` |
| Provincia.rar | https://ide.inei.gob.pe/files/Provincia.rar | `PROVINCIA.gpkg` |
| Distrito.rar | https://ide.inei.gob.pe/files/Distrito.rar | `DISTRITO.gpkg` |

Esas mismas URL las publica el paquete `geoidep` (`get_inei_link`). El atributo `fuente` dentro del GPKG dice `V Censo Nacional Economico`. El CRS declarado en `gpkg_spatial_ref_sys` es **EPSG:4326**. No hubo reproyección.

Conteos leídos: 25 departamentos, 196 provincias, 1890 distritos. Geometría `MULTIPOLYGON`.

## Pasos

1. Descargar los tres `.rar` en `sources/inei/`. Esa carpeta está en `.gitignore`.
2. Extraer. En Windows, `tar` abre estos RAR y deja el `.gpkg`.
3. Leer la tabla con SQLite. La columna `geom` es GeoPackage Binary (cabecera `GP` + WKB). El script `scripts/geo_geom.py` la convierte a GeoJSON `[longitud, latitud]`.
4. Simplificar cada anillo con Douglas-Peucker:
   - `0.0005°` (~55 m) para `*.validated.geojson` y `*.min.geojson`
   - `0.005°` para `*.preview.geojson`
5. Redondear a 6 decimales, cerrar anillos, quitar vértices repetidos y orientar según RFC 7946 (exterior antihorario, huecos horarios).
6. Descartar geometría nula o degenerada y deduplicar por `ubigeo`. Lo descartado va a `data/validated/cuarentena/` y al reporte. En esta corrida no hubo descartes.
7. Escribir derivados TopoJSON con `scripts/derive.mjs` (`topojson-server`, cuantización `1e6`).

```bash
pnpm install
pnpm datos
```

`pnpm datos` ejecuta normalización, TopoJSON y validación.

## Esquema canónico

En todos los niveles, en minúsculas y sin tildes:

| Campo | Ejemplo |
| --- | --- |
| `ubigeo` | `150101` |
| `nombre_departamento` | `lima` |
| `nombre_provincia` | `lima` |
| `nombre_distrito` | `lima` |
| `capital` | `lima` |

En el departamento, `nombre_provincia` y `nombre_distrito` quedan en blanco. No se escriben valores `null`.

Los nombres del archivo histórico siguen como alias en `*.validated.geojson`: `NOMBDEP`, `FIRST_IDDP`, `NOMBPROV`, `FIRST_IDPR`, `NOMBDIST`, `IDDIST`, `IDDPTO`, `IDPROV`, `NOM_CAP`.

## Capitales

El GPKG no trae capital.

- Departamento: sede oficial, tabla `CAPITALES_DEPARTAMENTO` en `scripts/normalize_geojson.py`.
- Provincia: unión por nombre con `peru_capital_provincia.geojson` (IDEP-2016). Abreviaturas resueltas: `CARLOS F.FITZCARRALD`, `NAZCA`, `GRAL.SANCHEZ CERRO`. Datem del Marañón (`1607`, San Lorenzo) y Putumayo (`1608`, San Antonio del Estrecho) no están en ese punto y se completan en `CAPITAL_PROVINCIA_EXTRA`.
- Distrito: `NOM_CAP` de `peru_distrital_simple.geojson` cuando el ubigeo coincide. Los distritos creados después de ese archivo quedan con `capital` vacío (58 en la corrida actual). No se inventa el nombre.

Los puntos de capital de provincia se publican aparte como `peru-capitales.*`, con la geometría IDEP-2016.

## Shapefile

Si la fuente llega como Shapefile en lugar de GeoPackage:

```bash
pnpm --filter peru-geojson shapefile -- --input limite.shp --nivel distrital --output salida.geojson
```

`--list-fields` muestra las columnas del `.dbf`. La codificación por defecto es `windows-1252`. El resultado usa el mismo esquema canónico (`ubigeo`, `nombre_*`, `capital`) y guarda los campos originales en `alias`.

## Variantes web

```bash
pnpm variants
```

Lee `data/derived/*.preview.geojson` y escribe:

- `data/variants/light/*.geojson` — menos vértices, 4 decimales, para móvil y para el visor
- `data/variants/peru.topojson` — TopoJSON cuantizado
- `data/variants/peru-ubigeo.pmtiles` — teselas MVT en PMTiles v3
- `data/variants/MANIFEST.json` — pesos y reducción frente al validado

## Validación

`python scripts/validate_geojson.py` revisa tipo, `bbox`, ubigeo único, campos canónicos, anillos cerrados y ausencia de `crs` legacy. Si existe `node_modules`, además corre `@mapbox/geojsonhint`, el mismo motor que usa geojsonlint.

El reporte queda en `data/validated/reporte.json` y `data/validated/reporte.validacion.json`.
