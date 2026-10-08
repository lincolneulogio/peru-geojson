"""Centroide, bbox, vecinos y altitud de centroide por distrito.

- centroide: el ya calculado en data/indicadores/geometria.json
- bbox: el del indice data/ubigeo.json
- vecinos: arcos compartidos de data/derived/peru-distrital.topojson
  (frontera comun). La Punta queda aislada por la simplificacion de 0.0005°;
  si un distrito no tiene arco y otro vertice esta a <= 0.0008°, se agrega.
  Amantani y Anapia siguen sin vecino: son islas.
- altitud: cota del centroide en Copernicus DEM GLO-90, via Open-Meteo.
  No es la altitud de la capital. No hay coordenada de capital distrital.

Escribe data/espacial/distritos.json
Reutiliza altitudes previas si el archivo ya trae estado copernicus-dem-glo-90.
Para volver a consultar el DEM: python scripts/espacial_distrito.py --refrescar-altitud
"""
from __future__ import annotations

import json
import math
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "espacial" / "distritos.json"
CACHE = ROOT / "data" / "espacial" / "altitud-centroide.json"
UMBRAL_REPARACION = 0.0008
ESTADO_DEM = "copernicus-dem-glo-90"
API = "https://api.open-meteo.com/v1/elevation"


def arcos_de(arcs: Any, encontrados: set[int]) -> None:
    if not arcs:
        return
    if isinstance(arcs[0], int):
        for arco in arcs:
            encontrados.add(abs(int(arco)))
        return
    for parte in arcs:
        arcos_de(parte, encontrados)


def vecinos_por_arco() -> dict[str, set[str]]:
    topo = json.loads((ROOT / "data" / "derived" / "peru-distrital.topojson").read_text(encoding="utf-8"))
    duenos: dict[int, set[str]] = defaultdict(set)
    ubigeos: list[str] = []
    for geom in topo["objects"]["peru"]["geometries"]:
        ubigeo = geom["properties"]["ubigeo"]
        ubigeos.append(ubigeo)
        propios: set[int] = set()
        arcos_de(geom.get("arcs"), propios)
        for arco in propios:
            duenos[arco].add(ubigeo)
    vecinos: dict[str, set[str]] = {u: set() for u in ubigeos}
    for dueno in duenos.values():
        if len(dueno) < 2:
            continue
        ids = list(dueno)
        for i in ids:
            for j in ids:
                if i != j:
                    vecinos[i].add(j)
    return vecinos


def anillos(feature: dict[str, Any]) -> list[list[list[float]]]:
    geom = feature.get("geometry") or {}
    coords = geom.get("coordinates") or []
    if geom.get("type") == "MultiPolygon":
        return [ring for poly in coords for ring in poly]
    if geom.get("type") == "Polygon":
        return list(coords)
    return []


def bbox_de(feature: dict[str, Any]) -> tuple[float, float, float, float]:
    xs: list[float] = []
    ys: list[float] = []
    for ring in anillos(feature):
        for x, y in ring:
            xs.append(x)
            ys.append(y)
    return (min(xs), min(ys), max(xs), max(ys))


def distancia_minima(a: dict[str, Any], b: dict[str, Any]) -> float:
    mejor = 1e9
    for ring in anillos(a):
        for x, y in ring:
            for ring_b in anillos(b):
                for x2, y2 in ring_b:
                    dist = math.hypot(x - x2, y - y2)
                    if dist < mejor:
                        mejor = dist
    return mejor


def reparar_aislados(
    vecinos: dict[str, set[str]],
    features: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    cajas = {u: bbox_de(f) for u, f in features.items()}
    reparaciones: list[dict[str, Any]] = []
    aislados = [u for u, vs in vecinos.items() if not vs]
    for ubigeo in aislados:
        x0, y0, x1, y1 = cajas[ubigeo]
        mejor: tuple[float, str] | None = None
        for otro, caja in cajas.items():
            if otro == ubigeo:
                continue
            ox0, oy0, ox1, oy1 = caja
            if ox1 < x0 - 0.02 or ox0 > x1 + 0.02 or oy1 < y0 - 0.02 or oy0 > y1 + 0.02:
                continue
            dist = distancia_minima(features[ubigeo], features[otro])
            if mejor is None or dist < mejor[0]:
                mejor = (dist, otro)
        if mejor and mejor[0] <= UMBRAL_REPARACION:
            vecinos[ubigeo].add(mejor[1])
            vecinos[mejor[1]].add(ubigeo)
            reparaciones.append(
                {
                    "ubigeo": ubigeo,
                    "agrega": [mejor[1]],
                    "distancia_grados": round(mejor[0], 6),
                    "motivo": "arco compartido perdido por simplificacion Douglas-Peucker 0.0005",
                }
            )
    return reparaciones


def altitudes_previas() -> dict[str, int | None] | None:
    if "--refrescar-altitud" in sys.argv or not OUT.exists():
        return None
    previo = json.loads(OUT.read_text(encoding="utf-8"))
    estado = ((previo.get("meta") or {}).get("altitud") or {}).get("estado")
    if estado != ESTADO_DEM:
        return None
    return {
        ubigeo: rec.get("altitud_centroide_m")
        for ubigeo, rec in previo.get("distritos", {}).items()
    }


def leer_cache() -> dict[str, int | None]:
    if not CACHE.exists():
        return {}
    crudo = json.loads(CACHE.read_text(encoding="utf-8"))
    return {str(k): (None if v is None else int(v)) for k, v in crudo.items()}


def guardar_cache(cotas: dict[str, int | None]) -> None:
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_text(json.dumps(cotas, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def consultar_lote(grupo: list[tuple[str, float, float]]) -> list[int | None]:
    query = urllib.parse.urlencode(
        {
            "latitude": ",".join(f"{lat:.6f}" for _, _, lat in grupo),
            "longitude": ",".join(f"{lng:.6f}" for _, lng, _ in grupo),
        }
    )
    req = urllib.request.Request(
        f"{API}?{query}",
        headers={"User-Agent": "peru-geojson espacial_distrito"},
    )
    espera = 5.0
    ultimo: Exception | None = None
    for intento in range(6):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                cuerpo = json.loads(resp.read().decode("utf-8"))
            elev = cuerpo.get("elevation")
            if not isinstance(elev, list) or len(elev) != len(grupo):
                raise RuntimeError("respuesta de elevacion incompleta")
            return [None if valor is None else int(round(float(valor))) for valor in elev]
        except urllib.error.HTTPError as exc:
            ultimo = exc
            if exc.code != 429:
                raise
            time.sleep(espera)
            espera = min(espera * 2, 60)
        except Exception as exc:  # noqa: BLE001 - reintento de red
            ultimo = exc
            time.sleep(espera)
            espera = min(espera * 2, 60)
        print(f"reintento {intento + 1} tras {ultimo}")
    raise RuntimeError(f"Open-Meteo no respondio: {ultimo}") from ultimo


def consultar_dem(puntos: list[tuple[str, float, float]]) -> dict[str, int | None]:
    salida = leer_cache()
    pendientes = [p for p in puntos if p[0] not in salida]
    lote = 80
    for inicio in range(0, len(pendientes), lote):
        grupo = pendientes[inicio : inicio + lote]
        for (ubigeo, _, _), valor in zip(grupo, consultar_lote(grupo)):
            salida[ubigeo] = valor
        guardar_cache(salida)
        hechos = sum(1 for u, _, _ in puntos if u in salida)
        print(f"altitud {hechos}/{len(puntos)}")
        if inicio + lote < len(pendientes):
            time.sleep(1.5)
    return {u: salida[u] for u, _, _ in puntos}


def main() -> None:
    indice = json.loads((ROOT / "data" / "ubigeo.json").read_text(encoding="utf-8"))
    geometria = json.loads((ROOT / "data" / "indicadores" / "geometria.json").read_text(encoding="utf-8"))
    centroides = geometria["niveles"]["distrital"]
    fc = json.loads((ROOT / "data" / "derived" / "peru-distrital.min.geojson").read_text(encoding="utf-8"))
    features = {f["properties"]["ubigeo"]: f for f in fc["features"]}
    vecinos = vecinos_por_arco()
    reparaciones = reparar_aislados(vecinos, features)
    previos = altitudes_previas()
    puntos = []
    for dist in indice["distritos"]:
        ubigeo = dist["ubigeo"]
        lng, lat = centroides[ubigeo]["centroide"]
        puntos.append((ubigeo, lng, lat))
    if previos is not None and all(u in previos for u, _, _ in puntos):
        cotas = {u: previos[u] for u, _, _ in puntos}
        print("altitud reutilizada")
    else:
        cotas = consultar_dem(puntos)
    distritos: dict[str, dict[str, Any]] = {}
    for dist in indice["distritos"]:
        ubigeo = dist["ubigeo"]
        distritos[ubigeo] = {
            "centroide": centroides[ubigeo]["centroide"],
            "bbox": dist["bbox"],
            "altitud_centroide_m": cotas[ubigeo],
            "vecinos": sorted(vecinos[ubigeo]),
        }
    for ubigeo, rec in distritos.items():
        for vecino in rec["vecinos"]:
            if ubigeo not in distritos[vecino]["vecinos"]:
                raise SystemExit(f"vecindad asimetrica {ubigeo} -> {vecino}")
    documento = {
        "meta": {
            "nivel": "distrito",
            "n": len(distritos),
            "centroide": "Copia de data/indicadores/geometria.json (centroide planar del anillo mayor).",
            "bbox": "Copia de data/ubigeo.json.",
            "vecindad": {
                "metodo": "Arcos compartidos de peru-distrital.topojson (topojson-server, cuantizacion 1e6). Frontera comun, no solo esquina.",
                "reparacion_umbral_grados": UMBRAL_REPARACION,
                "reparaciones": reparaciones,
                "sin_vecino": sorted(u for u, rec in distritos.items() if not rec["vecinos"]),
            },
            "altitud": {
                "estado": ESTADO_DEM,
                "fuente": "Open-Meteo Elevation API, Copernicus DEM GLO-90",
                "url": API,
                "punto": "centroide del distrito",
                "unidad": "metros enteros",
                "nota": "No es la altitud oficial de la capital distrital. Las fuentes no traen la coordenada de esa capital. 58 distritos tampoco tienen nombre de capital.",
            },
            "generado_por": "scripts/espacial_distrito.py",
            "generado_en": datetime.now(timezone.utc).isoformat(),
        },
        "distritos": distritos,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(documento, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("vecinos reparados", reparaciones)
    print("sin vecino", documento["meta"]["vecindad"]["sin_vecino"])
    print("OK ->", OUT)


if __name__ == "__main__":
    main()
