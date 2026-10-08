"""Geometría GeoPackage/GeoJSON: lectura WKB, simplificación y saneamiento."""
from __future__ import annotations

import sqlite3
import struct
import unicodedata
from pathlib import Path
from typing import Any

PRECISION = 6
BBox = list[float]


def normalizar_nombre(valor: str | None) -> str:
    if valor is None:
        return ""
    texto = unicodedata.normalize("NFD", str(valor).strip().lower())
    texto = "".join(c for c in texto if unicodedata.category(c) != "Mn")
    return " ".join(texto.split())


def parse_gpkg_geom(blob: bytes) -> dict[str, Any]:
    if not isinstance(blob, (bytes, bytearray)) or blob[:2] != b"GP":
        raise ValueError("geometria GeoPackage invalida")
    flags = blob[3]
    if flags & 0x10:
        raise ValueError("geometria vacia")
    envelope = (flags & 0x0E) >> 1
    envelope_sizes = {0: 0, 1: 32, 2: 48, 3: 48, 4: 64}
    if envelope not in envelope_sizes:
        raise ValueError(f"sobre GeoPackage no soportado: {envelope}")
    geom, _offset = parse_wkb(blob, 8 + envelope_sizes[envelope])
    return geom


def parse_wkb(buf: bytes, offset: int) -> tuple[dict[str, Any], int]:
    endian = "<" if buf[offset] == 1 else ">"
    (wkb_type,) = struct.unpack_from(endian + "I", buf, offset + 1)
    offset += 5
    miles = (wkb_type // 1000) % 10
    has_z = bool(wkb_type & 0x80000000) or miles in (1, 3)
    has_m = bool(wkb_type & 0x40000000) or miles in (2, 3)
    base = wkb_type & 0xFF
    dims = 2 + int(has_z) + int(has_m)

    def read_point(off: int) -> tuple[list[float], int]:
        vals = struct.unpack_from(endian + ("d" * dims), buf, off)
        return [float(vals[0]), float(vals[1])], off + 8 * dims

    def read_ring(off: int) -> tuple[list[list[float]], int]:
        (n,) = struct.unpack_from(endian + "I", buf, off)
        off += 4
        ring: list[list[float]] = []
        for _ in range(n):
            point, off = read_point(off)
            ring.append(point)
        return ring, off

    if base == 1:
        point, offset = read_point(offset)
        return {"type": "Point", "coordinates": point}, offset
    if base == 3:
        (n_rings,) = struct.unpack_from(endian + "I", buf, offset)
        offset += 4
        rings = []
        for _ in range(n_rings):
            ring, offset = read_ring(offset)
            rings.append(ring)
        return {"type": "Polygon", "coordinates": rings}, offset
    if base == 6:
        (n_poly,) = struct.unpack_from(endian + "I", buf, offset)
        offset += 4
        polygons = []
        for _ in range(n_poly):
            polygon, offset = parse_wkb(buf, offset)
            if polygon["type"] != "Polygon":
                raise ValueError("MultiPolygon con parte no poligonal")
            polygons.append(polygon["coordinates"])
        return {"type": "MultiPolygon", "coordinates": polygons}, offset
    raise ValueError(f"tipo WKB no soportado: {wkb_type}")


def leer_gpkg(path: Path, table: str) -> list[dict[str, Any]]:
    con = sqlite3.connect(path)
    con.row_factory = sqlite3.Row
    try:
        rows = con.execute(f"SELECT * FROM {table}").fetchall()
    finally:
        con.close()
    features: list[dict[str, Any]] = []
    for row in rows:
        props = {key: row[key] for key in row.keys() if key != "geom"}
        features.append({"properties": props, "blob": row["geom"]})
    return features


def _distancia(punto: list[float], inicio: list[float], fin: list[float]) -> float:
    px, py = punto
    ax, ay = inicio
    bx, by = fin
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return ((px - ax) ** 2 + (py - ay) ** 2) ** 0.5
    t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
    t = 0.0 if t < 0 else 1.0 if t > 1 else t
    qx, qy = ax + t * dx, ay + t * dy
    return ((px - qx) ** 2 + (py - qy) ** 2) ** 0.5


def douglas_peucker(points: list[list[float]], epsilon: float) -> list[list[float]]:
    if len(points) < 3:
        return points
    dmax = 0.0
    index = 0
    for i in range(1, len(points) - 1):
        d = _distancia(points[i], points[0], points[-1])
        if d > dmax:
            dmax = d
            index = i
    if dmax > epsilon:
        left = douglas_peucker(points[: index + 1], epsilon)
        right = douglas_peucker(points[index:], epsilon)
        return left[:-1] + right
    return [points[0], points[-1]]


def _simplificar_anillo(ring: list[list[float]], epsilon: float) -> list[list[float]]:
    if len(ring) < 4:
        return ring
    cerrado = ring[0] == ring[-1]
    cuerpo = ring[:-1] if cerrado else ring
    salida = douglas_peucker(cuerpo, epsilon)
    if cerrado and (len(salida) == 1 or salida[0] != salida[-1]):
        salida = [*salida, salida[0]]
    return salida


def simplificar(geom: dict[str, Any], epsilon: float) -> dict[str, Any]:
    if geom["type"] == "Polygon":
        return {
            "type": "Polygon",
            "coordinates": [_simplificar_anillo(ring, epsilon) for ring in geom["coordinates"]],
        }
    if geom["type"] == "MultiPolygon":
        return {
            "type": "MultiPolygon",
            "coordinates": [
                [_simplificar_anillo(ring, epsilon) for ring in polygon]
                for polygon in geom["coordinates"]
            ],
        }
    if geom["type"] == "Point":
        return geom
    raise ValueError(f"geometria no soportada: {geom['type']}")


def _area_firmada(ring: list[list[float]]) -> float:
    total = 0.0
    for i in range(len(ring) - 1):
        x1, y1 = ring[i]
        x2, y2 = ring[i + 1]
        total += x1 * y2 - x2 * y1
    return total / 2


def _orientar(ring: list[list[float]], antihorario: bool) -> list[list[float]]:
    area = _area_firmada(ring)
    if antihorario and area < 0:
        return list(reversed(ring))
    if not antihorario and area > 0:
        return list(reversed(ring))
    return ring


def _limpiar_anillo(ring: list[list[float]]) -> list[list[float]]:
    if not ring:
        return []
    puntos = [[round(float(p[0]), PRECISION), round(float(p[1]), PRECISION)] for p in ring]
    limpios = [puntos[0]]
    for punto in puntos[1:]:
        if punto != limpios[-1]:
            limpios.append(punto)
    if len(limpios) >= 2 and limpios[0] != limpios[-1]:
        limpios.append(limpios[0])
    if len(limpios) < 4:
        return []
    return limpios


def sanear_poligono(geom: dict[str, Any]) -> dict[str, Any] | None:
    def sanear_polygon(rings: list[list[list[float]]]) -> list[list[list[float]]]:
        salida: list[list[list[float]]] = []
        for index, ring in enumerate(rings):
            limpio = _limpiar_anillo(ring)
            if not limpio:
                continue
            salida.append(_orientar(limpio, antihorario=index == 0))
        return salida

    if geom["type"] == "Polygon":
        rings = sanear_polygon(geom["coordinates"])
        if not rings:
            return None
        return {"type": "Polygon", "coordinates": rings}
    if geom["type"] == "MultiPolygon":
        polygons = []
        for polygon in geom["coordinates"]:
            rings = sanear_polygon(polygon)
            if rings:
                polygons.append(rings)
        if not polygons:
            return None
        if len(polygons) == 1:
            return {"type": "Polygon", "coordinates": polygons[0]}
        return {"type": "MultiPolygon", "coordinates": polygons}
    if geom["type"] == "Point":
        x, y = geom["coordinates"][:2]
        return {"type": "Point", "coordinates": [round(float(x), PRECISION), round(float(y), PRECISION)]}
    return None


def bbox_de(features: list[dict[str, Any]]) -> BBox | None:
    xs: list[float] = []
    ys: list[float] = []

    def walk(coords: Any) -> None:
        if isinstance(coords, list) and coords and isinstance(coords[0], (int, float)):
            xs.append(float(coords[0]))
            ys.append(float(coords[1]))
            return
        if isinstance(coords, list):
            for item in coords:
                walk(item)

    for feature in features:
        geometry = feature.get("geometry") or {}
        walk(geometry.get("coordinates", []))
    if not xs:
        return None
    return [
        round(min(xs), PRECISION),
        round(min(ys), PRECISION),
        round(max(xs), PRECISION),
        round(max(ys), PRECISION),
    ]


def bbox_geom(geometry: dict[str, Any]) -> BBox | None:
    return bbox_de([{"geometry": geometry}])
