"""Nombre presentable y gentilicio. Las tildes que no son regla viven en el archivo."""
from __future__ import annotations

from typing import TypedDict, cast

from peru_geojson.paths import leer_json

_CONECTORES = {"de", "del", "la", "el", "los", "las", "y", "e", "en", "al"}
_ROMANOS = {
    "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x",
    "xi", "xii", "xiii", "xiv", "xv", "xvi", "xvii", "xviii", "xix", "xx",
}


class TablasNombres(TypedDict):
    sobreescrituras: dict[str, str]
    gentilicios: dict[str, str | None]


def load_nombres() -> TablasNombres:
    sobre = cast(dict[str, object], leer_json("nombres/sobreescrituras.json"))
    gent = cast(dict[str, object], leer_json("nombres/gentilicios.json"))
    gentilicios = {k: (None if v is None else str(v)) for k, v in gent.items() if k != "_nota" and (v is None or isinstance(v, str))}
    crudo = sobre.get("sobreescrituras")
    sobreescrituras = crudo if isinstance(crudo, dict) else {}
    return {
        "sobreescrituras": {str(k): str(v) for k, v in sobreescrituras.items()},
        "gentilicios": gentilicios,
    }


def a_nombre_oficial(minusculas: str, overrides: dict[str, str] | None = None) -> str:
    clave = " ".join(minusculas.strip().lower().split())
    if overrides is not None and clave in overrides:
        return overrides[clave]
    partes: list[str] = []
    for i, palabra in enumerate(clave.split(" ")):
        if palabra in _ROMANOS:
            partes.append(palabra.upper())
        elif i > 0 and palabra in _CONECTORES:
            partes.append(palabra)
        elif palabra:
            partes.append(palabra[0].upper() + palabra[1:])
    return " ".join(partes)


def gentilicio(nombre_minusculas: str, mapa: dict[str, str | None] | None = None) -> str | None:
    if mapa is None:
        return None
    clave = " ".join(nombre_minusculas.strip().lower().split())
    return mapa.get(clave)
