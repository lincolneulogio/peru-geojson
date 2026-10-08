"""Indicadores por ubigeo. El join es LEFT: no inventa valores."""
from __future__ import annotations

from typing import TypedDict, cast

from peru_geojson.paths import leer_json
from peru_geojson.search import Feature, _props


class IndicadorSociodemografico(TypedDict, total=False):
    poblacion: int
    hogares: int
    pobreza_pct: float
    idh: float
    anio: int
    fuente: str
    sintetico: bool


class TablaIndicadores(TypedDict):
    meta: dict[str, object]
    registros: dict[str, IndicadorSociodemografico]


def load_indicadores_socio() -> TablaIndicadores:
    return cast(TablaIndicadores, leer_json("indicadores/sociodemograficos.json"))


def load_indicadores_demo() -> TablaIndicadores:
    return cast(TablaIndicadores, leer_json("indicadores/demo-sintetico.json"))


def load_indicadores_geo() -> dict[str, object]:
    return cast(dict[str, object], leer_json("indicadores/geometria.json"))


def _ubigeo(feature: Feature) -> str:
    valor = _props(feature).get("ubigeo")
    return valor if isinstance(valor, str) else ""


def join_indicadores(features: list[Feature], tabla: TablaIndicadores) -> list[Feature]:
    unidos: list[Feature] = []
    for feature in features:
        props = dict(_props(feature))
        props["indicadores"] = tabla["registros"].get(_ubigeo(feature))
        unidos.append({**feature, "properties": props})
    return unidos


def cobertura_indicadores(features: list[Feature], tabla: TablaIndicadores) -> dict[str, float | int]:
    con_datos = sum(1 for feature in features if _ubigeo(feature) in tabla["registros"])
    total = len(features)
    return {"total": total, "conDatos": con_datos, "pct": 0 if total == 0 else con_datos / total}
