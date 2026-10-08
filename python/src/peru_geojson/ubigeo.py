"""Validación y jerarquía de ubigeos. Misma semántica que `src/ubigeo.ts`."""
from __future__ import annotations

import re
import unicodedata

from peru_geojson.contrato import NivelCodigo

_UBIGEO = re.compile(r"^\d{2}(\d{2}(\d{2})?)?$")


def normalizar_texto(texto: str) -> str:
    plano = unicodedata.normalize("NFD", texto.lower())
    sin_tilde = "".join(c for c in plano if unicodedata.category(c) != "Mn")
    return " ".join(sin_tilde.split())


def es_ubigeo_valido(ubigeo: str) -> bool:
    return _UBIGEO.fullmatch(ubigeo.strip()) is not None


def nivel_de_ubigeo(ubigeo: str) -> NivelCodigo | None:
    codigo = ubigeo.strip()
    if not es_ubigeo_valido(codigo):
        return None
    if len(codigo) == 2:
        return "departamental"
    if len(codigo) == 4:
        return "provincial"
    return "distrital"


def ubigeo_padre(ubigeo: str) -> str | None:
    nivel = nivel_de_ubigeo(ubigeo)
    codigo = ubigeo.strip()
    if nivel is None or nivel == "departamental":
        return None
    if nivel == "provincial":
        return codigo[:2]
    return codigo[:4]


def pertenece_a(hijo: str, padre: str) -> bool:
    if not es_ubigeo_valido(hijo) or not es_ubigeo_valido(padre):
        return False
    child = hijo.strip()
    parent = padre.strip()
    if len(parent) >= len(child):
        return child == parent
    return child.startswith(parent)
