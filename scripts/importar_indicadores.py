"""Carga indicadores OFICIALES desde CSV a data/indicadores/sociodemograficos.json.

Formato CSV requerido (cabecera exacta):
  ubigeo,poblacion,hogares,pobreza_pct,idh,anio,fuente

Reglas:
- ubigeo debe existir en data/ubigeo.json (distritos). Filas desconocidas = error.
- poblacion/hogares: enteros >= 0. pobreza_pct: 0-100. idh: 0-1.
- Cualquier error detiene la carga (exit 1) sin escribir a medias.
- Escribe meta.estado = "oficial" con trazabilidad de archivos cargados.

Uso:
  python scripts/importar_indicadores.py sources/indicadores/censo2017.csv [otro.csv ...]
"""
from __future__ import annotations

import csv
import json
import pathlib
import sys
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parent.parent
DEST = ROOT / "data" / "indicadores" / "sociodemograficos.json"


def cargar_ubigeos_validos() -> set[str]:
    u = json.loads((ROOT / "data" / "ubigeo.json").read_text(encoding="utf-8"))
    return {d["ubigeo"] for d in u["distritos"]}


def validar_fila(n: int, fila: dict[str, str], validos: set[str]) -> tuple[str, dict]:
    ubigeo = (fila.get("ubigeo") or "").strip()
    if ubigeo not in validos:
        raise ValueError(f"fila {n}: ubigeo desconocido '{ubigeo}'")
    try:
        poblacion = int(fila["poblacion"])
        hogares = int(fila["hogares"])
        pobreza = float(fila.get("pobreza_pct") or "nan")
        idh = float(fila.get("idh") or "nan")
        anio = int(fila.get("anio") or 0)
    except (KeyError, ValueError) as e:
        raise ValueError(f"fila {n} ({ubigeo}): número inválido ({e})") from e
    if poblacion < 0 or hogares < 0:
        raise ValueError(f"fila {n} ({ubigeo}): poblacion/hogares negativos")
    if not (0 <= pobreza <= 100):
        raise ValueError(f"fila {n} ({ubigeo}): pobreza_pct fuera de 0-100")
    if not (0 <= idh <= 1):
        raise ValueError(f"fila {n} ({ubigeo}): idh fuera de 0-1")
    return ubigeo, {
        "poblacion": poblacion, "hogares": hogares, "pobreza_pct": pobreza,
        "idh": idh, "anio": anio, "fuente": (fila.get("fuente") or "").strip(),
    }


def main(archivos: list[str]) -> int:
    if not archivos:
        print("Uso: python scripts/importar_indicadores.py sources/indicadores/xxx.csv [...]", file=sys.stderr)
        return 2
    validos = cargar_ubigeos_validos()
    registros: dict[str, dict] = {}
    for archivo in archivos:
        with open(archivo, encoding="utf-8-sig") as f:
            lector = csv.DictReader(f)
            faltan = {"ubigeo", "poblacion", "hogares"} - set(lector.fieldnames or [])
            if faltan:
                print(f"{archivo}: cabecera incompleta, faltan {sorted(faltan)}", file=sys.stderr)
                return 1
            for n, fila in enumerate(lector, start=2):
                ubigeo, reg = validar_fila(n, fila, validos)
                registros[ubigeo] = reg
        print(f"{archivo}: {len(registros)} registros acumulados")
    DEST.write_text(json.dumps({
        "meta": {
            "estado": "oficial",
            "archivos": archivos,
            "cobertura": f"{len(registros)}/1890 distritos",
            "generado_en": datetime.now(timezone.utc).isoformat(),
        },
        "registros": registros,
    }, ensure_ascii=False), encoding="utf-8")
    print(f"OK {len(registros)}/1890 -> {DEST}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
