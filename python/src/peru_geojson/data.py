"""Carga del índice y de los GeoJSON min incluidos en el paquete."""
from __future__ import annotations

from typing import cast

from peru_geojson.contrato import IndiceUbigeo, NivelCapa
from peru_geojson.paths import leer_json

_ARCHIVOS: dict[NivelCapa, str] = {
    "departamental": "derived/peru-departamental.min.geojson",
    "provincial": "derived/peru-provincial.min.geojson",
    "distrital": "derived/peru-distrital.min.geojson",
    "capitales": "derived/peru-capitales.min.geojson",
}


def load_ubigeo_index() -> IndiceUbigeo:
    return cast(IndiceUbigeo, leer_json("ubigeo.json"))


def load_nivel(nivel: NivelCapa) -> dict[str, object]:
    return cast(dict[str, object], leer_json(_ARCHIVOS[nivel]))


def load_departamental() -> dict[str, object]:
    return load_nivel("departamental")


def load_provincial() -> dict[str, object]:
    return load_nivel("provincial")


def load_distrital() -> dict[str, object]:
    return load_nivel("distrital")


def load_capitales() -> dict[str, object]:
    return load_nivel("capitales")


def load_stats() -> dict[str, dict[str, int]]:
    indice = load_ubigeo_index()
    capitales = load_capitales()
    features = capitales.get("features")
    n_capitales = len(features) if isinstance(features, list) else 0
    return {
        "departamental": {"ok": len(indice["departamentos"])},
        "provincial": {"ok": len(indice["provincias"])},
        "distrital": {"ok": len(indice["distritos"])},
        "capitales": {"ok": n_capitales},
    }
