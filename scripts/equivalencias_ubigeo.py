"""Cruce de ubigeos INEI-2007 contra el catálogo canónico (descarga 2026-03-06).

No consulta decretos. Compara códigos y nombres normalizados de los GeoJSON
históricos con `data/ubigeo.json`. Para un distrito que solo existe en el
catálogo actual, el contenedor geométrico es el polígono 2007 que contiene
el centroide 2026: sirve para agregar una serie, no es el distrito madre legal.

Escribe:
  data/equivalencias/ubigeo-2007-2026.json
  data/equivalencias/cambios-2007-2026.csv
"""
from __future__ import annotations

import csv
import json
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

from geo_geom import normalizar_nombre  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "data" / "equivalencias"
NIVELES = ("departamento", "provincia", "distrito")


def poligonos(geom: dict[str, Any] | None) -> list[list[list[list[float]]]]:
    if not geom:
        return []
    tipo = geom.get("type")
    coords = geom.get("coordinates")
    if tipo == "Polygon" and isinstance(coords, list):
        return [coords]
    if tipo == "MultiPolygon" and isinstance(coords, list):
        return coords
    return []


def punto_en_anillo(anillo: list[list[float]], lng: float, lat: float) -> bool:
    dentro = False
    j = len(anillo) - 1
    for i in range(len(anillo)):
        xi, yi = anillo[i][0], anillo[i][1]
        xj, yj = anillo[j][0], anillo[j][1]
        if yi == lat and xi == lng:
            return True
        if yj == lat and xj == lng:
            return True
        if (yi > lat) != (yj > lat) and lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi:
            dentro = not dentro
        j = i
    return dentro


def punto_en_geom(geom: dict[str, Any] | None, lng: float, lat: float) -> bool:
    for poly in poligonos(geom):
        if not poly:
            continue
        exterior, *huecos = poly
        if not punto_en_anillo(exterior, lng, lat):
            continue
        if any(punto_en_anillo(h, lng, lat) for h in huecos):
            continue
        return True
    return False


def bbox_geom(geom: dict[str, Any] | None) -> tuple[float, float, float, float] | None:
    xs: list[float] = []
    ys: list[float] = []
    for poly in poligonos(geom):
        for ring in poly:
            for x, y in ring:
                xs.append(x)
                ys.append(y)
    if not xs:
        return None
    return (min(xs), min(ys), max(xs), max(ys))


def vertices_exterior(geom: dict[str, Any] | None) -> list[tuple[float, float]]:
    puntos: list[tuple[float, float]] = []
    for poly in poligonos(geom):
        if not poly:
            continue
        for x, y in poly[0]:
            puntos.append((x, y))
    return puntos


def campos_distintos(pares: list[tuple[str, str, str]]) -> list[str]:
    return [campo for campo, a, b in pares if a != b]


def campos_nivel(nivel: str, a: dict[str, str], b: dict[str, str]) -> list[str]:
    if nivel == "departamento":
        pares = [("nombre_departamento", a["nombre"], b["nombre"])]
    elif nivel == "provincia":
        pares = [
            ("nombre_departamento", a["nombre_departamento"], b["nombre_departamento"]),
            ("nombre_provincia", a["nombre"], b["nombre"]),
        ]
    else:
        pares = [
            ("nombre_departamento", a["nombre_departamento"], b["nombre_departamento"]),
            ("nombre_provincia", a["nombre_provincia"], b["nombre_provincia"]),
            ("nombre_distrito", a["nombre"], b["nombre"]),
        ]
    return campos_distintos(pares)


def fila(
    nivel: str,
    tipo: str,
    ubigeo_2007: str | None,
    ubigeo_2026: str | None,
    nombre_2007: str,
    nombre_2026: str,
    nombre_departamento: str,
    nombre_provincia_2007: str,
    nombre_provincia_2026: str,
    campos: list[str],
    contenedor_2007: str | None = None,
    contenedor_metodo: str | None = None,
) -> dict[str, Any]:
    return {
        "nivel": nivel,
        "tipo": tipo,
        "ubigeo_2007": ubigeo_2007,
        "ubigeo_2026": ubigeo_2026,
        "nombre_2007": nombre_2007,
        "nombre_2026": nombre_2026,
        "nombre_departamento": nombre_departamento,
        "nombre_provincia_2007": nombre_provincia_2007,
        "nombre_provincia_2026": nombre_provincia_2026,
        "campos": campos,
        "contenedor_2007": contenedor_2007,
        "contenedor_metodo": contenedor_metodo,
    }


def emparejar_por_nombre(
    rest_2007: dict[str, dict[str, str]],
    rest_2026: dict[str, dict[str, str]],
    clave: str,
) -> list[tuple[str, str]]:
    por_2007: dict[tuple[str, str], list[str]] = defaultdict(list)
    por_2026: dict[tuple[str, str], list[str]] = defaultdict(list)
    for ubigeo, rec in rest_2007.items():
        por_2007[(rec["nombre_departamento"], rec[clave])].append(ubigeo)
    for ubigeo, rec in rest_2026.items():
        por_2026[(rec["nombre_departamento"], rec[clave])].append(ubigeo)
    pares: list[tuple[str, str]] = []
    for key, actuales in por_2026.items():
        previos = por_2007.get(key, [])
        if len(actuales) == 1 and len(previos) == 1:
            pares.append((previos[0], actuales[0]))
    return pares


def cargar_2007() -> dict[str, dict[str, dict[str, str]]]:
    departamentos: dict[str, dict[str, str]] = {}
    dep = json.loads((ROOT / "peru_departamental_simple.geojson").read_text(encoding="utf-8"))
    for feature in dep["features"]:
        props = feature.get("properties") or {}
        ubigeo = str(props.get("FIRST_IDDP") or "").zfill(2)
        departamentos[ubigeo] = {
            "nombre_departamento": normalizar_nombre(props.get("NOMBDEP")),
            "nombre_provincia": "",
            "nombre": normalizar_nombre(props.get("NOMBDEP")),
        }

    provincias: dict[str, dict[str, str]] = {}
    prov = json.loads((ROOT / "peru_provincial_simple.geojson").read_text(encoding="utf-8"))
    for feature in prov["features"]:
        props = feature.get("properties") or {}
        ubigeo = str(props.get("FIRST_IDPR") or "").zfill(4)
        nombre_dep = normalizar_nombre(props.get("FIRST_NOMB"))
        nombre = normalizar_nombre(props.get("NOMBPROV"))
        provincias[ubigeo] = {
            "nombre_departamento": nombre_dep,
            "nombre_provincia": nombre,
            "nombre": nombre,
        }

    distritos: dict[str, dict[str, str]] = {}
    dist = json.loads((ROOT / "peru_distrital_simple.geojson").read_text(encoding="utf-8"))
    for feature in dist["features"]:
        props = feature.get("properties") or {}
        ubigeo = str(props.get("IDDIST") or "").zfill(6)
        distritos[ubigeo] = {
            "nombre_departamento": normalizar_nombre(props.get("NOMBDEP")),
            "nombre_provincia": normalizar_nombre(props.get("NOMBPROV")),
            "nombre": normalizar_nombre(props.get("NOMBDIST")),
        }
    return {"departamento": departamentos, "provincia": provincias, "distrito": distritos}


def cargar_2026() -> dict[str, dict[str, dict[str, str]]]:
    indice = json.loads((ROOT / "data" / "ubigeo.json").read_text(encoding="utf-8"))
    departamentos = {
        d["ubigeo"]: {
            "nombre_departamento": d["nombre_departamento"],
            "nombre_provincia": "",
            "nombre": d["nombre_departamento"],
        }
        for d in indice["departamentos"]
    }
    provincias = {
        d["ubigeo"]: {
            "nombre_departamento": d["nombre_departamento"],
            "nombre_provincia": d["nombre_provincia"],
            "nombre": d["nombre_provincia"],
        }
        for d in indice["provincias"]
    }
    distritos = {
        d["ubigeo"]: {
            "nombre_departamento": d["nombre_departamento"],
            "nombre_provincia": d["nombre_provincia"],
            "nombre": d["nombre_distrito"],
        }
        for d in indice["distritos"]
    }
    return {"departamento": departamentos, "provincia": provincias, "distrito": distritos}


def cruzar_nivel(
    nivel: str,
    base: dict[str, dict[str, str]],
    actual: dict[str, dict[str, str]],
    clave_nombre: str,
) -> list[dict[str, Any]]:
    filas: list[dict[str, Any]] = []
    comunes = set(base) & set(actual)
    for ubigeo in comunes:
        a = base[ubigeo]
        b = actual[ubigeo]
        campos = campos_nivel(nivel, a, b)
        tipo = "renombrado" if campos else "estable"
        filas.append(
            fila(
                nivel,
                tipo,
                ubigeo,
                ubigeo,
                a["nombre"],
                b["nombre"],
                b["nombre_departamento"] or a["nombre_departamento"],
                a["nombre_provincia"],
                b["nombre_provincia"],
                campos,
            )
        )

    rest_2007 = {u: base[u] for u in base.keys() - actual.keys()}
    rest_2026 = {u: actual[u] for u in actual.keys() - base.keys()}
    for previo, nuevo in emparejar_por_nombre(rest_2007, rest_2026, clave_nombre):
        a = rest_2007.pop(previo)
        b = rest_2026.pop(nuevo)
        campos = ["ubigeo"]
        if a["nombre_provincia"] != b["nombre_provincia"]:
            campos.append("nombre_provincia")
        if a["nombre_departamento"] != b["nombre_departamento"]:
            campos.append("nombre_departamento")
        if a["nombre"] != b["nombre"]:
            campos.append("nombre_" + nivel)
        filas.append(
            fila(
                nivel,
                "reasignado",
                previo,
                nuevo,
                a["nombre"],
                b["nombre"],
                b["nombre_departamento"] or a["nombre_departamento"],
                a["nombre_provincia"],
                b["nombre_provincia"],
                campos,
            )
        )

    for ubigeo, rec in rest_2026.items():
        filas.append(
            fila(
                nivel,
                "creado",
                None,
                ubigeo,
                "",
                rec["nombre"],
                rec["nombre_departamento"],
                "",
                rec["nombre_provincia"],
                [],
            )
        )
    for ubigeo, rec in rest_2007.items():
        filas.append(
            fila(
                nivel,
                "sin_par_2026",
                ubigeo,
                None,
                rec["nombre"],
                "",
                rec["nombre_departamento"],
                rec["nombre_provincia"],
                "",
                [],
            )
        )
    return filas


def geom_2007_por_ubigeo() -> tuple[dict[str, dict[str, Any]], int]:
    data = json.loads((ROOT / "peru_distrital_simple.geojson").read_text(encoding="utf-8"))
    salida: dict[str, dict[str, Any]] = {}
    nulos = 0
    for feature in data["features"]:
        props = feature.get("properties") or {}
        ubigeo = str(props.get("IDDIST") or "").zfill(6)
        geom = feature.get("geometry")
        if not geom:
            nulos += 1
            continue
        salida[ubigeo] = geom
    return salida, nulos


def preparar_busqueda(
    geoms: dict[str, dict[str, Any]],
) -> list[tuple[str, dict[str, Any], tuple[float, float, float, float]]]:
    lista = []
    for ubigeo, geom in geoms.items():
        caja = bbox_geom(geom)
        if caja is None:
            continue
        lista.append((ubigeo, geom, caja))
    return lista


def quienes_contienen(
    indice: list[tuple[str, dict[str, Any], tuple[float, float, float, float]]],
    lng: float,
    lat: float,
) -> list[str]:
    hits: list[str] = []
    for ubigeo, geom, (x0, y0, x1, y1) in indice:
        if lng < x0 or lng > x1 or lat < y0 or lat > y1:
            continue
        if punto_en_geom(geom, lng, lat):
            hits.append(ubigeo)
    return hits


def asignar_contenedores(filas: list[dict[str, Any]]) -> dict[str, int]:
    geoms, nulos = geom_2007_por_ubigeo()
    indice = preparar_busqueda(geoms)
    geometria = json.loads((ROOT / "data" / "indicadores" / "geometria.json").read_text(encoding="utf-8"))
    centroides: dict[str, list[float]] = geometria["niveles"]["distrital"]
    actuales = json.loads((ROOT / "data" / "derived" / "peru-distrital.min.geojson").read_text(encoding="utf-8"))
    vertices = {
        f["properties"]["ubigeo"]: vertices_exterior(f.get("geometry"))
        for f in actuales["features"]
    }
    conteo = {"centroide_dentro": 0, "vertice_dentro": 0, "ambiguo": 0, "sin_contencion": 0}
    for item in filas:
        if item["nivel"] != "distrito" or item["tipo"] != "creado":
            continue
        ubigeo = item["ubigeo_2026"]
        centro = centroides[ubigeo]["centroide"]
        hits = quienes_contienen(indice, centro[0], centro[1])
        if len(hits) == 1:
            item["contenedor_2007"] = hits[0]
            item["contenedor_metodo"] = "centroide_dentro"
            conteo["centroide_dentro"] += 1
            continue
        if len(hits) > 1:
            item["contenedor_metodo"] = "ambiguo"
            conteo["ambiguo"] += 1
            continue
        encontrado: str | None = None
        ambiguo = False
        for lng, lat in vertices.get(ubigeo, []):
            hits_v = quienes_contienen(indice, lng, lat)
            if len(hits_v) == 1:
                encontrado = hits_v[0]
                break
            if len(hits_v) > 1:
                ambiguo = True
        if encontrado:
            item["contenedor_2007"] = encontrado
            item["contenedor_metodo"] = "vertice_dentro"
            conteo["vertice_dentro"] += 1
        elif ambiguo:
            item["contenedor_metodo"] = "ambiguo"
            conteo["ambiguo"] += 1
        else:
            item["contenedor_metodo"] = "sin_contencion"
            conteo["sin_contencion"] += 1
    conteo["poligonos_2007_nulos"] = nulos
    return conteo


def resumen(filas: list[dict[str, Any]], base: dict[str, dict[str, dict[str, str]]], actual: dict[str, dict[str, dict[str, str]]]) -> dict[str, dict[str, int]]:
    salida: dict[str, dict[str, int]] = {}
    for nivel in NIVELES:
        del_nivel = [f for f in filas if f["nivel"] == nivel]
        tipos: dict[str, int] = defaultdict(int)
        for item in del_nivel:
            tipos[item["tipo"]] += 1
        salida[nivel] = {
            "2007": len(base[nivel]),
            "2026": len(actual[nivel]),
            "estable": tipos["estable"],
            "renombrado": tipos["renombrado"],
            "reasignado": tipos["reasignado"],
            "creado": tipos["creado"],
            "sin_par_2026": tipos["sin_par_2026"],
        }
    return salida


def escribir_csv(path: Path, filas: list[dict[str, Any]]) -> None:
    columnas = [
        "nivel",
        "tipo",
        "ubigeo_2007",
        "ubigeo_2026",
        "nombre_2007",
        "nombre_2026",
        "nombre_departamento",
        "nombre_provincia_2007",
        "nombre_provincia_2026",
        "campos",
        "contenedor_2007",
        "contenedor_metodo",
    ]
    cambios = [f for f in filas if f["tipo"] != "estable"]
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columnas)
        writer.writeheader()
        for item in cambios:
            writer.writerow(
                {
                    **{k: ("" if item[k] is None else item[k]) for k in columnas if k != "campos"},
                    "campos": "|".join(item["campos"]),
                }
            )


def main() -> None:
    base = cargar_2007()
    actual = cargar_2026()
    filas: list[dict[str, Any]] = []
    filas.extend(cruzar_nivel("departamento", base["departamento"], actual["departamento"], "nombre"))
    filas.extend(cruzar_nivel("provincia", base["provincia"], actual["provincia"], "nombre"))
    filas.extend(cruzar_nivel("distrito", base["distrito"], actual["distrito"], "nombre"))
    contenedores = asignar_contenedores(filas)
    orden = {"departamento": 0, "provincia": 1, "distrito": 2}
    filas.sort(key=lambda f: (orden[f["nivel"]], f["ubigeo_2026"] or "999999", f["ubigeo_2007"] or "999999"))
    totales = resumen(filas, base, actual)
    documento = {
        "meta": {
            "anio_base": 2007,
            "anio_destino": 2026,
            "fuente_2007": "peru_departamental_simple.geojson, peru_provincial_simple.geojson, peru_distrital_simple.geojson (INEI-2007)",
            "fuente_2026": "data/ubigeo.json (IDE-INEI, descarga 2026-03-06; el portal describe los limites como actualizados al 2023)",
            "nota_anio": "El lado 2026 es el catalogo canonico de este repositorio, no un padron legal fechado en 2026.",
            "contenedor_geometrico": "Solo distritos tipo creado. Ubigeo 2007 cuyo poligono contiene el centroide (o, si cae fuera, un vertice) del distrito 2026. Inferencia espacial para agregar series. No es el distrito del decreto de creacion.",
            "contenedores": contenedores,
            "generado_por": "scripts/equivalencias_ubigeo.py",
            "generado_en": datetime.now(timezone.utc).isoformat(),
        },
        "resumen": totales,
        "filas": filas,
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    json_path = OUT_DIR / "ubigeo-2007-2026.json"
    csv_path = OUT_DIR / "cambios-2007-2026.csv"
    json_path.write_text(json.dumps(documento, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    escribir_csv(csv_path, filas)
    print(json.dumps(totales, ensure_ascii=False, indent=2))
    print("contenedores", contenedores)
    print("OK ->", json_path)


if __name__ == "__main__":
    main()
