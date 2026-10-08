# Calidad de la generación canónica

Fuente de polígonos: GeoPackage IDE-INEI descargado el 6 de marzo de 2026 desde `https://ide.inei.gob.pe/files/{Departamento,Provincia,Distrito}.rar`. El portal describe esos límites como actualizados al 2023. CRS de origen: EPSG:4326. Atributo interno del GPKG: `V Censo Nacional Economico`.

Los GeoJSON históricos de la raíz no se reescribieron.

| Nivel                        | Entrada | Válidos | Nulos | Duplicados |
| ---------------------------- | ------- | ------- | ----- | ---------- |
| Departamental                | 25      | 25      | 0     | 0          |
| Provincial                   | 196     | 196     | 0     | 0          |
| Distrital                    | 1890    | 1890    | 0     | 0          |
| Capitales (puntos IDEP-2016) | 194     | 194     | 0     | —          |

`bbox` departamental: `[-81.328195, -18.350928, -68.652279, -0.038606]`.

Simplificación Douglas-Peucker: 0.0005° en validados y min; 0.005° en preview. Coordenadas a 6 decimales. Anillos cerrados y orientados según RFC 7946.

Capitales: el GPKG no las trae. Provincias cubiertas al 100% después de resolver tres abreviaturas del punto IDEP-2016 y de completar Datem del Marañón (`1607`) y Putumayo (`1608`). Distritos: 58 sin `NOM_CAP` histórico, porque ese ubigeo no está en `peru_distrital_simple.geojson`. Esos campos quedan en `""`, no en `null`.

Detalle reproducible: `python scripts/normalize_geojson.py` escribe `data/validated/reporte.json`.

## Validación externa (2026-10-08)

`python scripts/validate_geojson.py` → `data/validated/reporte.validacion.json`: `ok: true` en departamental, provincial y distrital, más `geojsonhint: ["ok"]` (validador @mapbox/geojsonhint). El CI (`.github/workflows/validar.yml`) re-ejecuta esta validación en cada push/PR junto a `pnpm variants` y el build del visor.

## Derivados y pesos

| Variante | Contenido | Peso aprox. | Reducción vs. validado |
|---|---|---|---|
| `data/validated/peru-*.validated.geojson` | Geometría completa + alias legacy | 13.5 MB total | — |
| `data/derived/peru-*.min.geojson` | Solo `ubigeo, nombre_*, capital`, 6 decimales | 12.7 MB total | — |
| `data/derived/peru-*.preview.geojson` | Simplificado 0.005° para zooms bajos | 2.7 MB total | — |
| `data/derived/peru-*.topojson` | Topología compartida por nivel | 5.0 MB total | — |
| `data/variants/light/*.geojson` | Ultra-livianos para móvil | 2.2 MB total | 81–93% |
| `data/variants/peru.topojson` | Todo el país en un archivo | 1.4 MB | 89% |
| `data/variants/peru-ubigeo.pmtiles` | Teselas vectoriales MVT gzip, zooms 0–10 | 1.6 MB | 88% |

Detalle por archivo en `data/variants/MANIFEST.json` (bytes y % de reducción auditados).

## Índice `data/ubigeo.json` (825 KB)

Catálogo sin geometrías: arrays `departamentos[]`, `provincias[]`, `distritos[]` con `nivel`, `ubigeo`, `nombre_*`, `capital`, `bbox` por registro y `alias` legacy. Ej.: Lima tiene 10 provincias (`ubigeo` que empieza con `15`). Es lo que consumen los visores para búsqueda instantánea y lo que empaqueta la librería (`loadUbigeoIndex()`).

## Esquema canónico

Toda feature validada: `ubigeo` (2/4/6 dígitos), `nombre_departamento`, `nombre_provincia`, `nombre_distrito`, `capital` — minúsculas, sin tildes — más alias legacy (`NOMBDEP`, `IDDIST`, `CCDD/CCPP/CCDI`…). Contrato TypeScript en `packages/peru-geojson/src/contrato.ts`.

## Licencia

Datos (GeoJSON, TopoJSON, PMTiles, catálogos y derivados en `data/`): **CC-BY-4.0** (`LICENSE-DATA`), atribución INEI + IDEP-2016 para capitales.

## Pin cartográfico `data/v2023`

La generación vigente es la actualización INEI 2023 (descarga del 6 de marzo de 2026). `data/versiones.json` declara `actual: "2023"`. `data/v2023/MANIFEST.json` guarda el sha256 de cada artefacto canónico (validados, derivados, variantes, índice y reportes). Los polígonos no se duplican dentro de `data/v2023/`: esas rutas canónicas *son* la edición 2023.

`python scripts/congelar_version.py --comprobar` (también en el CI) falla si un byte cambia sin actualizar el pin. Una edición 2024 se publica como `data/v2024/MANIFEST.json` cuando el reporte de normalización diga «actualizados al 2024»; no reescribe el manifiesto de 2023.

## Limitaciones conocidas

1. **58 distritos sin capital** (`capital: ""`): ubigeos nuevos sin correspondencia en el histórico 2007. No se inventaron datos.
2. **Capitales provinciales IDEP-2016** (10 años): los límites son 2023 pero los puntos son 2016.
3. **Simplificación**: 0.0005° (~50 m) desplaza micro-límites; no apto para catastro o litigio de linderos. Para eso, usar los GPKG originales en `sources/` (no versionados).
4. **Raíz intacta**: los 4 `*.geojson` históricos se conservan como insumos (`NOM_CAP`, capitales) y snapshot v1.
