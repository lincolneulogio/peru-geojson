"""Resuelve el directorio de datos: paquete instalado o checkout del repositorio."""
from __future__ import annotations

import os
from pathlib import Path


def data_dir() -> Path:
    env = os.environ.get("PERU_GEOJSON_DATA")
    if env:
        path = Path(env)
        if not (path / "ubigeo.json").is_file():
            raise FileNotFoundError(f"PERU_GEOJSON_DATA no contiene ubigeo.json: {path}")
        return path
    empaquetado = Path(__file__).resolve().parent / "data"
    if (empaquetado / "ubigeo.json").is_file():
        return empaquetado
    for padre in Path(__file__).resolve().parents:
        if (padre / "data" / "ubigeo.json").is_file() and (padre / "peru_distrital_simple.geojson").is_file():
            return padre / "data"
    raise FileNotFoundError("No se encontro data/ubigeo.json ni en el paquete ni en el repositorio.")


def leer_json(relativo: str) -> object:
    import json

    return json.loads((data_dir() / relativo).read_text(encoding="utf-8"))
