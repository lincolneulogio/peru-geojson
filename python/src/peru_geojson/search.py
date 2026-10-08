"""Filtro en memoria. Misma semántica que `src/search.ts`."""
from __future__ import annotations

from typing import TypedDict

from peru_geojson.contrato import NivelCapa
from peru_geojson.ubigeo import normalizar_texto

Feature = dict[str, object]


class FiltroGeo(TypedDict, total=False):
    dep: str | None
    prov: str | None
    q: str | None
    nivel: NivelCapa


def _props(feature: Feature) -> dict[str, object]:
    props = feature.get("properties")
    return props if isinstance(props, dict) else {}


def _texto(feature: Feature) -> str:
    props = _props(feature)
    partes = [
        props.get("ubigeo"),
        props.get("nombre_departamento"),
        props.get("nombre_provincia"),
        props.get("nombre_distrito"),
        props.get("capital"),
    ]
    return normalizar_texto(" ".join(p for p in partes if isinstance(p, str)))


def filtrar_features(features: list[Feature], filtro: FiltroGeo) -> list[Feature]:
    consulta = normalizar_texto(filtro.get("q") or "")
    dep = filtro.get("dep") or ""
    prov = filtro.get("prov") or ""
    nivel = filtro.get("nivel")
    salida: list[Feature] = []
    for feature in features:
        props = _props(feature)
        ubigeo = props.get("ubigeo")
        codigo = ubigeo if isinstance(ubigeo, str) else ""
        if dep and not codigo.startswith(dep):
            continue
        if nivel == "distrital" and prov and not codigo.startswith(prov):
            continue
        if consulta and consulta not in _texto(feature):
            continue
        salida.append(feature)
    return salida


def buscar_por_nombre(features: list[Feature], consulta: str, nivel: NivelCapa) -> list[Feature]:
    return filtrar_features(features, {"nivel": nivel, "q": consulta})
