"""Constantes del contrato. Los nombres de campo del JSON coinciden con TypeScript."""
from __future__ import annotations

from typing import Literal, TypedDict

LICENCIA_DATOS = "CC-BY-4.0"
LICENCIA_DATOS_URL = "https://creativecommons.org/licenses/by/4.0/"
ATRIBUCION = (
    "Instituto Nacional de Estadística e Informática (INEI). "
    "Límites departamentales, provinciales y distritales: IDE-INEI, actualización 2023. "
    "Capitales de provincia: Infraestructura de Datos Espaciales del Perú (IDEP), 2016."
)

BBox = tuple[float, float, float, float]
NivelRegistro = Literal["departamento", "provincia", "distrito"]
NivelCapa = Literal["departamental", "provincial", "distrital", "capitales"]
NivelCodigo = Literal["departamental", "provincial", "distrital"]


class RegistroUbigeo(TypedDict):
    nivel: NivelRegistro
    ubigeo: str
    nombre_departamento: str
    nombre_provincia: str
    nombre_distrito: str
    capital: str
    bbox: list[float]
    alias: dict[str, str]


class IndiceUbigeo(TypedDict):
    fuente: str
    descarga_last_modified: str
    crs: Literal["EPSG:4326"]
    departamentos: list[RegistroUbigeo]
    provincias: list[RegistroUbigeo]
    distritos: list[RegistroUbigeo]
