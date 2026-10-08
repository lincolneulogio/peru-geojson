"""Punto en polígono y geocodificación inversa. Misma semántica que `src/geo.ts`."""
from __future__ import annotations

from typing import Literal, TypedDict

from peru_geojson.search import Feature, _props

Anillo = list[list[float]]
NivelInverso = Literal["departamental", "provincial", "distrital"]


class Punto(TypedDict):
    lng: float
    lat: float


class ResultadoInverso(TypedDict):
    ubigeo: str
    nivel: NivelInverso
    properties: dict[str, object]
    exacto: bool


def punto_en_anillo(anillo: Anillo, punto: Punto) -> bool:
    dentro = False
    j = len(anillo) - 1
    for i in range(len(anillo)):
        xi, yi = anillo[i][0], anillo[i][1]
        xj, yj = anillo[j][0], anillo[j][1]
        if yi == punto["lat"] and xi == punto["lng"]:
            return True
        if yj == punto["lat"] and xj == punto["lng"]:
            return True
        if (yi > punto["lat"]) != (yj > punto["lat"]) and punto["lng"] < ((xj - xi) * (punto["lat"] - yi)) / (yj - yi) + xi:
            dentro = not dentro
        j = i
    return dentro


def punto_en_poligono(geom: dict[str, object], punto: Punto) -> bool:
    tipo = geom.get("type")
    coords = geom.get("coordinates")
    if not isinstance(coords, list):
        return False
    polys = coords if tipo == "MultiPolygon" else [coords]
    for poly in polys:
        if not isinstance(poly, list) or not poly:
            continue
        exterior = poly[0]
        huecos = poly[1:]
        if not isinstance(exterior, list) or not punto_en_anillo(exterior, punto):
            continue
        if any(isinstance(h, list) and punto_en_anillo(h, punto) for h in huecos):
            continue
        return True
    return False


def _nivel(ubigeo: str) -> NivelInverso:
    if len(ubigeo) <= 2:
        return "departamental"
    if len(ubigeo) <= 4:
        return "provincial"
    return "distrital"


def _bbox(coords: object) -> tuple[float, float, float, float] | None:
    xs: list[float] = []
    ys: list[float] = []

    def walk(nodo: object) -> None:
        if isinstance(nodo, list) and len(nodo) >= 2 and isinstance(nodo[0], (int, float)) and isinstance(nodo[1], (int, float)):
            xs.append(float(nodo[0]))
            ys.append(float(nodo[1]))
            return
        if isinstance(nodo, list):
            for item in nodo:
                walk(item)

    walk(coords)
    if not xs:
        return None
    return (min(xs), min(ys), max(xs), max(ys))


def reverse_geocode(
    features: list[Feature],
    punto: Punto,
    fallback: Literal["mas-cercano"] | None = None,
    centroides: dict[str, list[float]] | None = None,
) -> ResultadoInverso | None:
    for feature in features:
        geom = feature.get("geometry")
        if not isinstance(geom, dict) or geom.get("type") not in ("Polygon", "MultiPolygon"):
            continue
        caja = feature.get("bbox")
        if not (isinstance(caja, list) and len(caja) == 4):
            caja_calc = _bbox(geom.get("coordinates"))
            caja = list(caja_calc) if caja_calc else None
        if isinstance(caja, list) and (
            punto["lng"] < caja[0] or punto["lng"] > caja[2] or punto["lat"] < caja[1] or punto["lat"] > caja[3]
        ):
            continue
        if punto_en_poligono(geom, punto):
            ubigeo = str(_props(feature).get("ubigeo") or "")
            props = _props(feature)
            return {"ubigeo": ubigeo, "nivel": _nivel(ubigeo), "properties": props, "exacto": True}
    if fallback == "mas-cercano" and centroides:
        mejor: str | None = None
        mejor_d = float("inf")
        for ubigeo, coords in centroides.items():
            dist = (coords[0] - punto["lng"]) ** 2 + (coords[1] - punto["lat"]) ** 2
            if dist < mejor_d:
                mejor_d = dist
                mejor = ubigeo
        if mejor:
            feature = next((f for f in features if str(_props(f).get("ubigeo")) == mejor), None)
            props = _props(feature) if feature else {}
            return {"ubigeo": mejor, "nivel": _nivel(mejor), "properties": props, "exacto": False}
    return None
