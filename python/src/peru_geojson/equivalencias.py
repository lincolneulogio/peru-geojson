"""Cruce 2007 ↔ catálogo 2026. Misma tabla que `loadEquivalencias()`."""
from __future__ import annotations

from typing import Literal, TypedDict, cast

from peru_geojson.paths import leer_json

LadoUbigeo = Literal["2007", "2026"]
TipoCambioUbigeo = Literal["estable", "renombrado", "reasignado", "creado", "sin_par_2026"]
MetodoContenedor = Literal["centroide_dentro", "vertice_dentro", "ambiguo", "sin_contencion"]
NivelCruce = Literal["departamento", "provincia", "distrito"]


class FilaEquivalencia(TypedDict):
    nivel: NivelCruce
    tipo: TipoCambioUbigeo
    ubigeo_2007: str | None
    ubigeo_2026: str | None
    nombre_2007: str
    nombre_2026: str
    nombre_departamento: str
    nombre_provincia_2007: str
    nombre_provincia_2026: str
    campos: list[str]
    contenedor_2007: str | None
    contenedor_metodo: MetodoContenedor | None


class TablaEquivalencias(TypedDict):
    meta: dict[str, object]
    resumen: dict[str, dict[str, int]]
    filas: list[FilaEquivalencia]


def load_equivalencias() -> TablaEquivalencias:
    return cast(TablaEquivalencias, leer_json("equivalencias/ubigeo-2007-2026.json"))


def cruce_ubigeo(tabla: TablaEquivalencias, ubigeo: str, lado: LadoUbigeo) -> FilaEquivalencia | None:
    clave = "ubigeo_2007" if lado == "2007" else "ubigeo_2026"
    for fila in tabla["filas"]:
        if fila[clave] == ubigeo:
            return fila
    return None


def ubigeo_equivalente(tabla: TablaEquivalencias, ubigeo: str, desde: LadoUbigeo) -> str | None:
    encontrada = cruce_ubigeo(tabla, ubigeo, desde)
    if encontrada is None or encontrada["tipo"] in ("creado", "sin_par_2026"):
        return None
    return encontrada["ubigeo_2026"] if desde == "2007" else encontrada["ubigeo_2007"]


def contenedor_geometrico(tabla: TablaEquivalencias, ubigeo_2026: str) -> str | None:
    encontrada = cruce_ubigeo(tabla, ubigeo_2026, "2026")
    if encontrada is None or encontrada["tipo"] != "creado":
        return None
    return encontrada["contenedor_2007"]


def cambios_ubigeo(tabla: TablaEquivalencias) -> list[FilaEquivalencia]:
    return [fila for fila in tabla["filas"] if fila["tipo"] != "estable"]
