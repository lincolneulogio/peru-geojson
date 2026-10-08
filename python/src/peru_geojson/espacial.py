"""Centroide, bbox, altitud de centroide y vecinos por distrito."""
from __future__ import annotations

from typing import TypedDict, cast

from peru_geojson.contrato import BBox
from peru_geojson.paths import leer_json


class RegistroEspacialDistrito(TypedDict):
    centroide: list[float]
    bbox: list[float]
    altitud_centroide_m: int | None
    vecinos: list[str]


class TablaEspacialDistritos(TypedDict):
    meta: dict[str, object]
    distritos: dict[str, RegistroEspacialDistrito]


def load_espacial_distritos() -> TablaEspacialDistritos:
    return cast(TablaEspacialDistritos, leer_json("espacial/distritos.json"))


def registro_espacial(tabla: TablaEspacialDistritos, ubigeo: str) -> RegistroEspacialDistrito | None:
    return tabla["distritos"].get(ubigeo)


def vecinos_de(tabla: TablaEspacialDistritos, ubigeo: str) -> list[str]:
    registro = tabla["distritos"].get(ubigeo)
    if registro is None:
        return []
    return list(registro["vecinos"])


def altitud_centroide(tabla: TablaEspacialDistritos, ubigeo: str) -> int | None:
    registro = tabla["distritos"].get(ubigeo)
    if registro is None:
        return None
    return registro["altitud_centroide_m"]


def bbox_de(tabla: TablaEspacialDistritos, ubigeo: str) -> BBox | None:
    registro = tabla["distritos"].get(ubigeo)
    if registro is None or len(registro["bbox"]) != 4:
        return None
    oeste, sur, este, norte = registro["bbox"]
    return (oeste, sur, este, norte)
