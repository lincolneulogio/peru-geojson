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
