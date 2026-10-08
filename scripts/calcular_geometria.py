"""Calcula indicadores geométricos REALES desde los polígonos validados.

Método honesto y determinista (sin dependencias externas):
- area_km2: exceso esférico por anillos (fórmula trapezoidal de Chamberlain-Duquette,
  R = 6371.0088 km). Excluye huecos (islas del Titicaca, etc.).
- centroide: centroide planar del anillo exterior más grande, en [lng, lat].
  Suficiente para etiquetas y fallback de cercanía; no es centroide geodésico.
- n_vertices: conteo del exterior (proxy de complejidad para simplificar).

Escribe data/indicadores/geometria.json
"""
from __future__ import annotations

import json
import math
import pathlib
from datetime import datetime, timezone

R = 6371.0088
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "indicadores" / "geometria.json"

NIVELES = {
    "departamental": "data/validated/peru-departamental.validated.geojson",
    "provincial": "data/validated/peru-provincial.validated.geojson",
    "distrital": "data/validated/peru-distrital.validated.geojson",
}


def anillo_area(ring: list) -> float:
    total = 0.0
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
        total += math.radians(x2 - x1) * (math.sin(math.radians(y1)) + math.sin(math.radians(y2)))
    return abs(total) * R * R / 2.0


def anillo_centroide(ring: list) -> tuple[float, float]:
    a = cx = cy = 0.0
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
        c = x1 * y2 - x2 * y1
        a += c
        cx += (x1 + x2) * c
        cy += (y1 + y2) * c
    if a == 0:
        xs = [p[0] for p in ring]
        ys = [p[1] for p in ring]
        return (sum(xs) / len(xs), sum(ys) / len(ys))
    return (cx / (3 * a), cy / (3 * a))


def medir(feature: dict) -> dict:
    geom = feature["geometry"]
    polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    area = 0.0
    mejor: tuple[float, list] = (0.0, [])
    for poly in polys:
        exterior, *huecos = poly
        a_ext = anillo_area(exterior)
        area += a_ext - sum(anillo_area(h) for h in huecos)
        if a_ext > mejor[0]:
            mejor = (a_ext, exterior)
    cx, cy = anillo_centroide(mejor[1])
    return {
        "area_km2": round(area, 3),
        "centroide": [round(cx, 6), round(cy, 6)],
        "n_vertices": len(mejor[1]),
    }


def main() -> None:
    niveles: dict[str, dict[str, dict]] = {}
    for nivel, rel in NIVELES.items():
        fc = json.loads((ROOT / rel).read_text(encoding="utf-8"))
        tabla = {}
        for f in fc["features"]:
            tabla[f["properties"]["ubigeo"]] = medir(f)
        niveles[nivel] = tabla
        print(f"{nivel}: {len(tabla)} registros")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "meta": {
            "metodo": "Exceso esferico (Chamberlain-Duquette, R=6371.0088km) sin huecos; centroide planar del anillo mayor.",
            "unidades": {"area_km2": "km2", "centroide": "[lng, lat] WGS84"},
            "generado_por": "scripts/calcular_geometria.py",
            "generado_en": datetime.now(timezone.utc).isoformat(),
            "estado": "real-derivado",
        },
        "niveles": niveles,
    }, ensure_ascii=False), encoding="utf-8")
    print("OK ->", OUT)


if __name__ == "__main__":
    main()
