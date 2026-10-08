# peru-geojson

Mismo contrato y el mismo índice que el paquete TypeScript: 25 departamentos, 196 provincias, 1890 distritos (IDE-INEI, descarga del 6 de marzo de 2026; el portal los describe como actualizados al 2023).

El código es MIT. Los datos son CC-BY-4.0: hay que atribuir al INEI (límites) y al IDEP (capitales de provincia, 2016). La altitud del centroide viene de Copernicus DEM GLO-90 vía Open-Meteo.

## Instalar

```bash
pip install peru-geojson
pip install "peru-geojson[gis]"   # GeoPandas
```

En este repositorio, sin instalar:

```bash
python -m unittest discover -s python/tests -v
```

## Usar

```python
from peru_geojson import (
    contenedor_geometrico,
    load_equivalencias,
    load_espacial_distritos,
    load_ubigeo_index,
    ubigeo_equivalente,
    vecinos_de,
)

indice = load_ubigeo_index()          # mismos campos que ubigeo.json
cruce = load_equivalencias()
ubigeo_equivalente(cruce, "160109", "2007")   # "160801" (Putumayo salió de Maynas)
contenedor_geometrico(cruce, "070107")        # "070106" (inferido, no es el decreto)

espacial = load_espacial_distritos()
vecinos_de(espacial, "150101")
```

Con GeoPandas:

```python
from peru_geojson import a_geodataframe

distritos = a_geodataframe("distrital")  # 1890 filas, EPSG:4326
```

## Nombres

| TypeScript | Python |
| --- | --- |
| `esUbigeoValido` | `es_ubigeo_valido` |
| `nivelDeUbigeo` | `nivel_de_ubigeo` |
| `ubigeoPadre` | `ubigeo_padre` |
| `perteneceA` | `pertenece_a` |
| `normalizarTexto` | `normalizar_texto` |
| `filtrarFeatures` | `filtrar_features` |
| `buscarPorNombre` | `buscar_por_nombre` |
| `loadUbigeoIndex` | `load_ubigeo_index` |
| `loadDistrital` | `load_distrital` |
| `loadEquivalencias` | `load_equivalencias` |
| `cruceUbigeo` | `cruce_ubigeo` |
| `ubigeoEquivalente` | `ubigeo_equivalente` |
| `contenedorGeometrico` | `contenedor_geometrico` |
| `cambiosUbigeo` | `cambios_ubigeo` |
| `loadEspacialDistritos` | `load_espacial_distritos` |
| `vecinosDe` | `vecinos_de` |
| `altitudCentroide` | `altitud_centroide` |
| `reverseGeocode` | `reverse_geocode` |
| `joinIndicadores` | `join_indicadores` |
| `aNombreOficial` | `a_nombre_oficial` |

`ubigeo_equivalente` devuelve el código del otro año solo si hay par (`estable`, `renombrado`, `reasignado`). Un distrito creado no tiene ubigeo 2007. `contenedor_geometrico` es el polígono 2007 que contiene el centroide: sirve para sumar una serie, no reemplaza al código.
