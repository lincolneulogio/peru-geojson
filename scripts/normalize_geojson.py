"""Genera el esquema canónico sin modificar los GeoJSON originales.

Lee los GeoPackage oficiales del IDE-INEI (sources/inei/*.gpkg), elimina
geometrías nulas, deduplica por ubigeo y escribe:

  data/validated/peru-*.validated.geojson
  data/derived/peru-*.min.geojson
  data/derived/peru-*.preview.geojson
  data/ubigeo.json
  data/validated/reporte.json

Las capitales no vienen en el GPKG. Se completan con una tabla de sedes
departamentales, los puntos IDEP-2016 y el NOM_CAP histórico por ubigeo.

Uso:
  python scripts/normalize_geojson.py
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

from geo_geom import (  # noqa: E402
    bbox_de,
    bbox_geom,
    leer_gpkg,
    normalizar_nombre,
    parse_gpkg_geom,
    sanear_poligono,
    simplificar,
)

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "sources" / "inei"
VALIDATED = ROOT / "data" / "validated"
DERIVED = ROOT / "data" / "derived"
CUARENTENA = VALIDATED / "cuarentena"
EPSILON = 0.0005
EPSILON_PREVIEW = 0.005

# Sedes departamentales. El GPKG del IDE-INEI no trae el campo capital.
CAPITALES_DEPARTAMENTO = {
    "01": "CHACHAPOYAS",
    "02": "HUARAZ",
    "03": "ABANCAY",
    "04": "AREQUIPA",
    "05": "AYACUCHO",
    "06": "CAJAMARCA",
    "07": "CALLAO",
    "08": "CUSCO",
    "09": "HUANCAVELICA",
    "10": "HUANUCO",
    "11": "ICA",
    "12": "HUANCAYO",
    "13": "TRUJILLO",
    "14": "CHICLAYO",
    "15": "LIMA",
    "16": "IQUITOS",
    "17": "PUERTO MALDONADO",
    "18": "MOQUEGUA",
    "19": "CERRO DE PASCO",
    "20": "PIURA",
    "21": "PUNO",
    "22": "MOYOBAMBA",
    "23": "TACNA",
    "24": "TUMBES",
    "25": "PUCALLPA",
}

METADATA = {
    "fuente": "IDE-INEI https://ide.inei.gob.pe/files/{Departamento,Provincia,Distrito}.rar",
    "descarga_last_modified": "2026-03-06",
    "portal": "Límites departamental, provincial y distrital actualizados al 2023 (ide.inei.gob.pe)",
    "atributo_fuente_gpkg": "V Censo Nacional Economico",
    "crs": "EPSG:4326",
    "rfc": "RFC 7946 (sin miembro crs; WGS84 implícito)",
    "precision_decimales": 6,
    "simplificacion_grados": EPSILON,
    "simplificacion_preview_grados": EPSILON_PREVIEW,
    "capitales": (
        "El GPKG no incluye capital. Departamento: sede oficial. "
        "Provincia: union por nombre con peru_capital_provincia.geojson (IDEP-2016). "
        "Distrito: NOM_CAP de peru_distrital_simple.geojson cuando el ubigeo coincide."
    ),
    "generado_por": "scripts/normalize_geojson.py",
    "compatibilidad": (
        "Los archivos de la raíz no se modifican. En el validado, NOMBDEP, "
        "FIRST_IDDP, NOMBPROV, FIRST_IDPR, NOMBDIST, IDDIST, IDDPTO, IDPROV "
        "y NOM_CAP se conservan como alias."
    ),
}


def canon(
    ubigeo: str,
    departamento: str,
    provincia: str = "",
    distrito: str = "",
    capital: str = "",
    alias: dict[str, str] | None = None,
) -> dict[str, str]:
    props: dict[str, str] = {
        "ubigeo": ubigeo,
        "nombre_departamento": normalizar_nombre(departamento),
        "nombre_provincia": normalizar_nombre(provincia),
        "nombre_distrito": normalizar_nombre(distrito),
        "capital": normalizar_nombre(capital),
    }
    for clave, valor in (alias or {}).items():
        if valor is not None and str(valor).strip() != "":
            props[clave] = str(valor).strip()
    return props


# El punto IDEP-2016 usa abreviaturas que no coinciden con el nombre INEI.
ALIAS_PROVINCIA_CAPITAL = {
    ("ancash", "carlos f.fitzcarrald"): ("ancash", "carlos fermin fitzcarrald"),
    ("ica", "nazca"): ("ica", "nasca"),
    ("moquegua", "gral.sanchez cerro"): ("moquegua", "general sanchez cerro"),
}

# Provincias posteriores al archivo de capitales (o ausentes en ese extracto).
CAPITAL_PROVINCIA_EXTRA = {
    "1607": "SAN LORENZO",
    "1608": "SAN ANTONIO DEL ESTRECHO",
}


def cargar_capitales_provincia() -> dict[tuple[str, str], str]:
    path = ROOT / "peru_capital_provincia.geojson"
    data = json.loads(path.read_text(encoding="utf-8"))
    indice: dict[tuple[str, str], str] = {}
    for feature in data["features"]:
        props = feature.get("properties") or {}
        clave = (
            normalizar_nombre(props.get("DEPARTAM")),
            normalizar_nombre(props.get("PROVINCIA")),
        )
        clave = ALIAS_PROVINCIA_CAPITAL.get(clave, clave)
        capital = str(props.get("CAPITAL") or "").strip()
        if clave[0] and clave[1] and capital and clave not in indice:
            indice[clave] = capital
    return indice


def cargar_capitales_distrito() -> dict[str, str]:
    path = ROOT / "peru_distrital_simple.geojson"
    data = json.loads(path.read_text(encoding="utf-8"))
    indice: dict[str, str] = {}
    for feature in data["features"]:
        props = feature.get("properties") or {}
        ubigeo = str(props.get("IDDIST") or "").zfill(6)
        capital = str(props.get("NOM_CAP") or "").strip()
        if ubigeo and capital:
            indice[ubigeo] = capital
    return indice


def geometria_poligonal(blob: bytes, epsilon: float) -> dict[str, Any] | None:
    cruda = parse_gpkg_geom(blob)
    simple = simplificar(cruda, epsilon)
    return sanear_poligono(simple)


def deduplicar(
    candidatos: list[dict[str, Any]],
    nivel: str,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, int]]:
    vistos: dict[str, dict[str, Any]] = {}
    errores: list[dict[str, Any]] = []
    stats = {"entrada": len(candidatos), "nulos": 0, "duplicados": 0, "degenerados": 0}
    for item in candidatos:
        ubigeo = item["properties"]["ubigeo"]
        if not item.get("geometry"):
            stats["nulos"] += 1
            errores.append({
                "type": "Feature",
                "id": ubigeo,
                "properties": {**item["properties"], "_error": "GEOMETRIA_NULA_O_VACIA", "_nivel": nivel},
                "geometry": None,
            })
            continue
        if ubigeo in vistos:
            stats["duplicados"] += 1
            errores.append({
                "type": "Feature",
                "id": ubigeo,
                "properties": {**item["properties"], "_error": "UBIGEO_DUPLICADO", "_nivel": nivel},
                "geometry": item["geometry"],
            })
            continue
        vistos[ubigeo] = item
    ordenados = [vistos[clave] for clave in sorted(vistos)]
    stats["validos"] = len(ordenados)
    stats["errores"] = len(errores)
    return ordenados, errores, stats


def feature(props: dict[str, str], geometry: dict[str, Any] | None) -> dict[str, Any]:
    return {
        "type": "Feature",
        "id": props["ubigeo"],
        "bbox": bbox_geom(geometry) if geometry else None,
        "properties": props,
        "geometry": geometry,
    }


def escribir_coleccion(path: Path, features: list[dict[str, Any]], extra: dict[str, Any] | None = None) -> None:
    limpios = []
    for item in features:
        copia = {k: v for k, v in item.items() if v is not None}
        limpios.append(copia)
    coleccion: dict[str, Any] = {
        "type": "FeatureCollection",
        "bbox": bbox_de(limpios),
        "metadata": {**METADATA, **(extra or {})},
        "features": limpios,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(coleccion, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def a_min(features: list[dict[str, Any]]) -> list[dict[str, Any]]:
    claves = ("ubigeo", "nombre_departamento", "nombre_provincia", "nombre_distrito", "capital")
    salida = []
    for item in features:
        props = {clave: item["properties"].get(clave, "") for clave in claves}
        salida.append({
            "type": "Feature",
            "id": item["id"],
            "properties": props,
            "geometry": item["geometry"],
        })
    return salida


def registro(feature_item: dict[str, Any], nivel: str) -> dict[str, Any]:
    props = feature_item["properties"]
    alias = {
        clave: props[clave]
        for clave in (
            "NOMBDEP", "FIRST_IDDP", "NOMBPROV", "FIRST_IDPR", "FIRST_NOMB",
            "NOMBDIST", "IDDIST", "IDDPTO", "IDPROV", "NOM_CAP",
            "CAPITAL", "DEPARTAM", "PROVINCIA", "DISTRITO",
        )
        if clave in props
    }
    return {
        "nivel": nivel,
        "ubigeo": props["ubigeo"],
        "nombre_departamento": props["nombre_departamento"],
        "nombre_provincia": props["nombre_provincia"],
        "nombre_distrito": props["nombre_distrito"],
        "capital": props["capital"],
        "bbox": feature_item.get("bbox"),
        "alias": alias,
    }


def construir_poligonos(
    tabla: str,
    nivel: str,
    filas_a_item: Any,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Any]]:
    filas = leer_gpkg(SRC / f"{tabla}.gpkg", tabla)
    candidatos_validados: list[dict[str, Any]] = []
    candidatos_preview: list[dict[str, Any]] = []
    fallos: list[dict[str, Any]] = []
    for fila in filas:
        props = filas_a_item(fila["properties"])
        try:
            geom = geometria_poligonal(fila["blob"], EPSILON)
            preview = geometria_poligonal(fila["blob"], EPSILON_PREVIEW)
        except ValueError as exc:
            fallos.append({
                "type": "Feature",
                "id": props["ubigeo"],
                "properties": {**props, "_error": "GEOMETRIA_INVALIDA", "_detalle": str(exc), "_nivel": nivel},
                "geometry": None,
            })
            continue
        if geom is None:
            candidatos_validados.append({"properties": props, "geometry": None})
        else:
            candidatos_validados.append(feature(props, geom))
        if preview is not None:
            candidatos_preview.append(feature(props, preview))
    ok, errores, stats = deduplicar(candidatos_validados, nivel)
    errores.extend(fallos)
    stats["errores"] = len(errores)
    stats["degenerados"] = stats["nulos"]
    preview_ok = []
    ids = {item["id"] for item in ok}
    for item in candidatos_preview:
        if item["id"] in ids:
            preview_ok.append(item)
    preview_ok.sort(key=lambda item: item["id"])
    return ok, preview_ok, {"stats": stats, "errores": errores}


def main() -> int:
    if not (SRC / "DISTRITO.gpkg").exists():
        print("Falta sources/inei/*.gpkg. Ver docs/TRANSFORMACION.md", file=sys.stderr)
        return 1

    capital_prov = cargar_capitales_provincia()
    capital_dist = cargar_capitales_distrito()
    nombres_dep: dict[str, str] = {}

    def item_departamento(props: dict[str, Any]) -> dict[str, str]:
        ccdd = str(props["ccdd"]).zfill(2)
        nombre = str(props["nombdep"]).strip()
        nombres_dep[ccdd] = nombre
        capital = CAPITALES_DEPARTAMENTO[ccdd]
        return canon(
            ccdd,
            nombre,
            capital=capital,
            alias={"NOMBDEP": nombre, "FIRST_IDDP": ccdd, "CCDD": ccdd},
        )

    departamentos, preview_dep, rep_dep = construir_poligonos(
        "DEPARTAMENTO", "departamento", item_departamento
    )

    sin_capital_prov = 0

    def item_provincia(props: dict[str, Any]) -> dict[str, str]:
        nonlocal sin_capital_prov
        ccdd = str(props["ccdd"]).zfill(2)
        ccpp = str(props["ccpp"]).zfill(2)
        ubigeo = ccdd + ccpp
        departamento = str(props["nombdep"]).strip()
        provincia = str(props["nombprov"]).strip()
        capital = capital_prov.get(
            (normalizar_nombre(departamento), normalizar_nombre(provincia)),
            CAPITAL_PROVINCIA_EXTRA.get(ubigeo, ""),
        )
        if not capital:
            sin_capital_prov += 1
        alias = {
            "NOMBDEP": departamento,
            "FIRST_IDDP": ccdd,
            "NOMBPROV": provincia,
            "FIRST_IDPR": ubigeo,
            "FIRST_NOMB": departamento,
            "CCDD": ccdd,
            "CCPP": ccpp,
        }
        if capital:
            alias["CAPITAL"] = capital
        return canon(ubigeo, departamento, provincia, capital=capital, alias=alias)

    provincias, preview_prov, rep_prov = construir_poligonos(
        "PROVINCIA", "provincia", item_provincia
    )

    sin_capital_dist = 0

    def item_distrito(props: dict[str, Any]) -> dict[str, str]:
        nonlocal sin_capital_dist
        ubigeo = str(props["ubigeo"]).zfill(6)
        ccdd = str(props["ccdd"]).zfill(2)
        ccpp = str(props["ccpp"]).zfill(2)
        departamento = str(props["nombdep"]).strip()
        provincia = str(props["nombprov"]).strip()
        distrito = str(props["nombdist"]).strip()
        capital = capital_dist.get(ubigeo, "")
        if not capital:
            sin_capital_dist += 1
        alias = {
            "NOMBDEP": departamento,
            "FIRST_IDDP": ccdd,
            "NOMBPROV": provincia,
            "FIRST_IDPR": ccdd + ccpp,
            "FIRST_NOMB": departamento,
            "NOMBDIST": distrito,
            "IDDIST": ubigeo,
            "IDDPTO": ccdd,
            "IDPROV": ccdd + ccpp,
            "CCDD": ccdd,
            "CCPP": ccpp,
            "CCDI": str(props["ccdi"]).zfill(2),
        }
        if capital:
            alias["NOM_CAP"] = capital
        return canon(ubigeo, departamento, provincia, distrito, capital, alias)

    distritos, preview_dist, rep_dist = construir_poligonos(
        "DISTRITO", "distrito", item_distrito
    )

    capitales = []
    crudo_caps = json.loads((ROOT / "peru_capital_provincia.geojson").read_text(encoding="utf-8"))
    for feature_src in crudo_caps["features"]:
        props = feature_src.get("properties") or {}
        geom = feature_src.get("geometry")
        if not geom or not geom.get("coordinates"):
            continue
        departamento = str(props.get("DEPARTAM") or "").strip()
        provincia = str(props.get("PROVINCIA") or "").strip()
        distrito = str(props.get("DISTRITO") or "").strip()
        capital = str(props.get("CAPITAL") or "").strip()
        ubigeo = ""
        for item in provincias:
            if (
                item["properties"]["nombre_departamento"] == normalizar_nombre(departamento)
                and item["properties"]["nombre_provincia"] == normalizar_nombre(provincia)
            ):
                ubigeo = item["properties"]["ubigeo"]
                break
        if not ubigeo:
            ubigeo = normalizar_nombre(departamento)[:2] + normalizar_nombre(provincia)[:4]
        punto = sanear_poligono({"type": "Point", "coordinates": geom["coordinates"]})
        alias = {
            "CAPITAL": capital,
            "DEPARTAM": departamento,
            "PROVINCIA": provincia,
            "DISTRITO": distrito,
            "NOMBDEP": departamento,
            "NOMBPROV": provincia,
        }
        props_out = canon(ubigeo or capital, departamento, provincia, distrito, capital, alias)
        if punto:
            capitales.append(feature(props_out, punto))

    niveles = {
        "departamental": (departamentos, preview_dep, rep_dep),
        "provincial": (provincias, preview_prov, rep_prov),
        "distrital": (distritos, preview_dist, rep_dist),
    }
    for nombre, (ok, preview, _rep) in niveles.items():
        escribir_coleccion(VALIDATED / f"peru-{nombre}.validated.geojson", ok)
        escribir_coleccion(
            DERIVED / f"peru-{nombre}.min.geojson",
            a_min(ok),
            {"variante": "min", "campos": "solo canonicos, 6 decimales"},
        )
        escribir_coleccion(
            DERIVED / f"peru-{nombre}.preview.geojson",
            a_min(preview),
            {"variante": "preview", "simplificacion_grados": EPSILON_PREVIEW},
        )
        if _rep["errores"]:
            escribir_coleccion(CUARENTENA / f"peru-{nombre}.errors.geojson", _rep["errores"])

    escribir_coleccion(
        VALIDATED / "peru-capitales.validated.geojson",
        capitales,
        {"variante": "puntos", "fuente_geometria": "peru_capital_provincia.geojson (IDEP-2016)"},
    )
    escribir_coleccion(DERIVED / "peru-capitales.min.geojson", a_min(capitales), {"variante": "min"})
    escribir_coleccion(
        DERIVED / "peru-capitales.preview.geojson",
        a_min(capitales),
        {"variante": "preview"},
    )

    indice = {
        "fuente": METADATA["fuente"],
        "descarga_last_modified": METADATA["descarga_last_modified"],
        "crs": "EPSG:4326",
        "departamentos": [registro(item, "departamento") for item in departamentos],
        "provincias": [registro(item, "provincia") for item in provincias],
        "distritos": [registro(item, "distrito") for item in distritos],
    }
    (ROOT / "data" / "ubigeo.json").write_text(
        json.dumps(indice, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    reporte = {
        "generado_en": datetime.now(timezone.utc).isoformat(),
        "metodo": (
            "GPKG IDE-INEI (EPSG:4326) -> WKB -> Douglas-Peucker -> "
            "6 decimales -> anillos cerrados y orientación RFC 7946 -> "
            "deduplicado por ubigeo. Originales de la raíz intactos."
        ),
        "metadata": METADATA,
        "departamental": {**rep_dep["stats"], "bbox": bbox_de(departamentos)},
        "provincial": {
            **rep_prov["stats"],
            "bbox": bbox_de(provincias),
            "capitales_sin_dato": sin_capital_prov,
        },
        "distrital": {
            **rep_dist["stats"],
            "bbox": bbox_de(distritos),
            "capitales_sin_dato": sin_capital_dist,
            "capitales_historicas": len(capital_dist),
        },
        "capitales": {"validos": len(capitales), "fuente": "IDEP-2016"},
    }
    (VALIDATED / "reporte.json").write_text(
        json.dumps(reporte, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(reporte, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.setrecursionlimit(10000)
    raise SystemExit(main())
