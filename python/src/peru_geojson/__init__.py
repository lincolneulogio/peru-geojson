"""API pública. Los nombres en snake_case corresponden 1:1 al paquete TypeScript."""
from peru_geojson.contrato import ATRIBUCION, LICENCIA_DATOS, LICENCIA_DATOS_URL
from peru_geojson.data import (
    load_capitales,
    load_departamental,
    load_distrital,
    load_nivel,
    load_provincial,
    load_stats,
    load_ubigeo_index,
)
from peru_geojson.equivalencias import (
    cambios_ubigeo,
    contenedor_geometrico,
    cruce_ubigeo,
    load_equivalencias,
    ubigeo_equivalente,
)
from peru_geojson.espacial import altitud_centroide, load_espacial_distritos, registro_espacial, vecinos_de
from peru_geojson.geo import punto_en_anillo, punto_en_poligono, reverse_geocode
from peru_geojson.geodataframe import a_geodataframe
from peru_geojson.indicadores import (
    cobertura_indicadores,
    join_indicadores,
    load_indicadores_demo,
    load_indicadores_geo,
    load_indicadores_socio,
)
from peru_geojson.nombres import a_nombre_oficial, gentilicio, load_nombres
from peru_geojson.search import buscar_por_nombre, filtrar_features
from peru_geojson.ubigeo import es_ubigeo_valido, nivel_de_ubigeo, normalizar_texto, pertenece_a, ubigeo_padre

__all__ = [
    "ATRIBUCION",
    "LICENCIA_DATOS",
    "LICENCIA_DATOS_URL",
    "a_geodataframe",
    "a_nombre_oficial",
    "altitud_centroide",
    "buscar_por_nombre",
    "cambios_ubigeo",
    "cobertura_indicadores",
    "contenedor_geometrico",
    "cruce_ubigeo",
    "es_ubigeo_valido",
    "filtrar_features",
    "gentilicio",
    "join_indicadores",
    "load_capitales",
    "load_departamental",
    "load_distrital",
    "load_equivalencias",
    "load_espacial_distritos",
    "load_indicadores_demo",
    "load_indicadores_geo",
    "load_indicadores_socio",
    "load_nivel",
    "load_nombres",
    "load_provincial",
    "load_stats",
    "load_ubigeo_index",
    "nivel_de_ubigeo",
    "normalizar_texto",
    "pertenece_a",
    "punto_en_anillo",
    "punto_en_poligono",
    "registro_espacial",
    "reverse_geocode",
    "ubigeo_equivalente",
    "ubigeo_padre",
    "vecinos_de",
]
