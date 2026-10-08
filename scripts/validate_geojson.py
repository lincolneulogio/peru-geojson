"""Valida los GeoJSON canónicos y escribe data/validated/reporte.validacion.json.

Comprueba el contrato de este repositorio y, si Node está disponible,
delega la revisión RFC 7946 en @mapbox/geojsonhint (el motor de geojsonlint).

Uso:
  python scripts/validate_geojson.py
"""
from __future__ import annotations

import json
import math
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
VALIDATED = ROOT / "data" / "validated"
ARCHIVOS = {
    "departamental": (VALIDATED / "peru-departamental.validated.geojson", 2, 25),
    "provincial": (VALIDATED / "peru-provincial.validated.geojson", 4, 196),
    "distrital": (VALIDATED / "peru-distrital.validated.geojson", 6, 1890),
}
PERU = (-84.0, -20.0, -68.0, 1.0)
CANONICOS = ("ubigeo", "nombre_departamento", "nombre_provincia", "nombre_distrito", "capital")


def anillos(geometry: dict[str, Any]) -> list[list[list[float]]]:
    tipo = geometry.get("type")
    coords = geometry.get("coordinates")
    if tipo == "Polygon":
        return coords
    if tipo == "MultiPolygon":
        return [ring for polygon in coords for ring in polygon]
    return []


def revisar(path: Path, digitos: int, minimo: int) -> list[str]:
    errores: list[str] = []
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("type") != "FeatureCollection":
        return ["no es FeatureCollection"]
    if "crs" in data:
        errores.append("trae miembro crs legacy; RFC 7946 lo prohibe")
    bbox = data.get("bbox")
    if not (isinstance(bbox, list) and len(bbox) == 4):
        errores.append("falta bbox")
    elif not (PERU[0] <= bbox[0] <= bbox[2] <= PERU[2] and PERU[1] <= bbox[1] <= bbox[3] <= PERU[3]):
        errores.append(f"bbox fuera de Peru: {bbox}")
    features = data.get("features")
    if not isinstance(features, list):
        return errores + ["features no es lista"]
    if len(features) < minimo:
        errores.append(f"solo {len(features)} features; se esperaban al menos {minimo}")
    vistos: set[str] = set()
    for index, feature in enumerate(features):
        prefijo = f"feature[{index}]"
        props = feature.get("properties") or {}
        if any(valor is None for valor in props.values()):
            errores.append(f"{prefijo} tiene un valor nulo")
        for clave in CANONICOS:
            if clave not in props or not isinstance(props[clave], str):
                errores.append(f"{prefijo} carece de {clave}")
        ubigeo = str(props.get("ubigeo", ""))
        if len(ubigeo) != digitos or not ubigeo.isdigit():
            errores.append(f"{prefijo} ubigeo invalido: {ubigeo}")
        elif ubigeo in vistos:
            errores.append(f"{prefijo} ubigeo duplicado: {ubigeo}")
        vistos.add(ubigeo)
        if not props.get("nombre_departamento"):
            errores.append(f"{prefijo} nombre_departamento vacio")
        geom = feature.get("geometry") or {}
        if geom.get("type") not in ("Polygon", "MultiPolygon"):
            errores.append(f"{prefijo} geometria {geom.get('type')}")
            continue
        for ring in anillos(geom):
            if len(ring) < 4 or ring[0] != ring[-1]:
                errores.append(f"{prefijo} anillo abierto o degenerado")
                break
            if any(
                not isinstance(pt, list) or len(pt) < 2 or not all(isinstance(n, (int, float)) and math.isfinite(n) for n in pt[:2])
                for pt in ring
            ):
                errores.append(f"{prefijo} coordenada no numerica")
                break
        if len(errores) > 40:
            errores.append("demasiados errores; se corta el detalle")
            break
    return errores


def geojsonhint(paths: list[Path]) -> list[str]:
    node = shutil.which("node")
    script = ROOT / "packages" / "peru-geojson" / "scripts" / "geojsonhint.mjs"
    modulo = ROOT / "packages" / "peru-geojson" / "node_modules" / "@mapbox" / "geojsonhint"
    if not node or not script.exists() or not modulo.exists():
        return ["geojsonhint omitido: instala dependencias con pnpm install en la raiz"]
    proc = subprocess.run(
        [node, str(script), *[str(path) for path in paths]],
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=False,
    )
    if proc.returncode != 0:
        detalle = (proc.stdout or proc.stderr or "geojsonhint fallo").strip()
        return detalle.splitlines() or ["geojsonhint fallo"]
    return ["ok"]


def main() -> int:
    informe: dict[str, Any] = {"archivos": {}, "ok": True}
    rutas = []
    for nivel, (path, digitos, minimo) in ARCHIVOS.items():
        if not path.exists():
            informe["archivos"][nivel] = {"ok": False, "errores": ["archivo ausente"]}
            informe["ok"] = False
            continue
        errores = revisar(path, digitos, minimo)
        informe["archivos"][nivel] = {
            "archivo": path.name,
            "ok": not errores,
            "errores": errores,
        }
        if errores:
            informe["ok"] = False
        rutas.append(path)
    hint = geojsonhint(rutas) if rutas else ["sin archivos"]
    informe["geojsonhint"] = hint
    if hint and hint != ["ok"] and not hint[0].startswith("geojsonhint omitido"):
        informe["ok"] = False
    salida = VALIDATED / "reporte.validacion.json"
    salida.write_text(json.dumps(informe, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(informe, ensure_ascii=False, indent=2))
    return 0 if informe["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
