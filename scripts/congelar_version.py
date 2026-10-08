"""Congela la generación canónica como data/vYYYY/MANIFEST.json.

Los polígonos siguen en las rutas canónicas (data/validated, data/derived,
data/variants, data/ubigeo.json). El manifiesto fija el sha256 de cada
artefacto. Una edición posterior del INEI no reescribe data/v2023: se publica
data/vYYYY y, si corresponde, se cambia el campo actual de data/versiones.json.

Uso:
  python scripts/congelar_version.py
  python scripts/congelar_version.py --comprobar
  python scripts/congelar_version.py --actualizar
  python scripts/congelar_version.py --anio 2024 --establecer-actual
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from datetime import date
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
REPORTE = RAIZ / "data" / "validated" / "reporte.json"
VERSIONES = RAIZ / "data" / "versiones.json"
CDN_PMTILES = (
    "https://cdn.jsdelivr.net/gh/lincolneulogio/peru-geojson@master/data/variants/peru-ubigeo.pmtiles"
)

ARTEFACTOS = [
    ("validado-departamental", "data/validated/peru-departamental.validated.geojson"),
    ("validado-provincial", "data/validated/peru-provincial.validated.geojson"),
    ("validado-distrital", "data/validated/peru-distrital.validated.geojson"),
    ("validado-capitales", "data/validated/peru-capitales.validated.geojson"),
    ("min-departamental", "data/derived/peru-departamental.min.geojson"),
    ("min-provincial", "data/derived/peru-provincial.min.geojson"),
    ("min-distrital", "data/derived/peru-distrital.min.geojson"),
    ("min-capitales", "data/derived/peru-capitales.min.geojson"),
    ("preview-departamental", "data/derived/peru-departamental.preview.geojson"),
    ("preview-provincial", "data/derived/peru-provincial.preview.geojson"),
    ("preview-distrital", "data/derived/peru-distrital.preview.geojson"),
    ("preview-capitales", "data/derived/peru-capitales.preview.geojson"),
    ("topojson-departamental", "data/derived/peru-departamental.topojson"),
    ("topojson-provincial", "data/derived/peru-provincial.topojson"),
    ("topojson-distrital", "data/derived/peru-distrital.topojson"),
    ("topojson-capitales", "data/derived/peru-capitales.topojson"),
    ("light-departamentos", "data/variants/light/departamentos.geojson"),
    ("light-provincias", "data/variants/light/provincias.geojson"),
    ("light-distritos", "data/variants/light/distritos.geojson"),
    ("light-capitales", "data/variants/light/capitales.geojson"),
    ("topojson", "data/variants/peru.topojson"),
    ("pmtiles", "data/variants/peru-ubigeo.pmtiles"),
    ("indice", "data/ubigeo.json"),
    ("reporte-normalizacion", "data/validated/reporte.json"),
    ("reporte-validacion", "data/validated/reporte.validacion.json"),
]

POLITICA = (
    "Cada año cartográfico del INEI se publica como data/vYYYY/MANIFEST.json. "
    "Ese manifiesto fija el sha256 de los artefactos canónicos. "
    "El CI rechaza bytes que no coincidan con el pin. "
    "Una edición nueva no reescribe el manifiesto anterior: se agrega data/vYYYY "
    "y, con --establecer-actual, se cambia actual."
)


def anio_del_reporte(reporte: dict) -> str:
    portal = str(reporte.get("metadata", {}).get("portal", ""))
    coincidencia = re.search(r"actualizados al (\d{4})", portal)
    if not coincidencia:
        raise SystemExit("El reporte no declara el año cartográfico (se esperaba 'actualizados al YYYY').")
    return coincidencia.group(1)


def huella(ruta: Path) -> tuple[str, int]:
    digest = hashlib.sha256()
    tamano = 0
    with ruta.open("rb") as archivo:
        while True:
            bloque = archivo.read(1024 * 1024)
            if not bloque:
                break
            digest.update(bloque)
            tamano += len(bloque)
    return digest.hexdigest(), tamano


def inventario() -> list[dict]:
    filas = []
    for identificador, relativo in ARTEFACTOS:
        ruta = RAIZ / relativo
        if not ruta.is_file():
            raise SystemExit(f"Falta el artefacto {relativo}")
        sha, tamano = huella(ruta)
        filas.append({"id": identificador, "ruta": relativo, "bytes": tamano, "sha256": sha})
    return filas


def diferencias(anterior: list[dict], actual: list[dict]) -> list[str]:
    previos = {item["id"]: item for item in anterior}
    mensajes = []
    for item in actual:
        previo = previos.get(item["id"])
        if previo is None:
            mensajes.append(f"{item['id']}: no estaba en el pin")
            continue
        if previo.get("sha256") != item["sha256"]:
            mensajes.append(f"{item['id']}: sha256 distinto ({previo.get('sha256')} -> {item['sha256']})")
        if previo.get("ruta") != item["ruta"]:
            mensajes.append(f"{item['id']}: la ruta cambió")
    ids_actuales = {item["id"] for item in actual}
    for identificador in previos:
        if identificador not in ids_actuales:
            mensajes.append(f"{identificador}: desapareció del inventario")
    return mensajes


def escribir(ruta: Path, valor: dict) -> None:
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_text(json.dumps(valor, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def construir_manifiesto(anio: str, reporte: dict, artefactos: list[dict], congelado_en: str) -> dict:
    metadata = reporte["metadata"]
    return {
        "id": anio,
        "anio_cartografico": int(anio),
        "etiqueta": f"IDE-INEI, actualización {anio}",
        "fuente": metadata["fuente"],
        "descarga_last_modified": metadata["descarga_last_modified"],
        "portal": metadata["portal"],
        "crs": "EPSG:4326",
        "licencia": "CC-BY-4.0",
        "licencia_url": "https://creativecommons.org/licenses/by/4.0/",
        "congelado_en": congelado_en,
        "almacen": "canonico",
        "conteos": {
            "departamentos": reporte["departamental"]["validos"],
            "provincias": reporte["provincial"]["validos"],
            "distritos": reporte["distrital"]["validos"],
            "capitales": reporte["capitales"]["validos"],
        },
        "bbox": reporte["departamental"]["bbox"],
        "nota": (
            "Los bytes de esta edición viven en las rutas listadas. "
            "Este manifiesto es el pin auditable. Publicar otro año no lo reescribe."
        ),
        "cdn": {"pmtiles": CDN_PMTILES},
        "artefactos": artefactos,
    }


def actualizar_catalogo(anio: str, conteos: dict, establecer_actual: bool) -> dict:
    if VERSIONES.is_file():
        catalogo = json.loads(VERSIONES.read_text(encoding="utf-8"))
    else:
        catalogo = {"actual": anio, "politica": POLITICA, "versiones": []}
    catalogo["politica"] = POLITICA
    entrada = {
        "id": anio,
        "anio_cartografico": int(anio),
        "etiqueta": f"IDE-INEI, actualización {anio}",
        "manifiesto": f"data/v{anio}/MANIFEST.json",
        "conteos": conteos,
    }
    versiones = [item for item in catalogo.get("versiones", []) if item.get("id") != anio]
    versiones.append(entrada)
    versiones.sort(key=lambda item: item["id"])
    catalogo["versiones"] = versiones
    if establecer_actual or "actual" not in catalogo:
        catalogo["actual"] = anio
    return catalogo


def main() -> int:
    parser = argparse.ArgumentParser(description="Congela o comprueba el pin cartográfico anual.")
    parser.add_argument("--anio", help="Año cartográfico. Por defecto, el que declara el reporte.")
    parser.add_argument("--comprobar", action="store_true", help="Falla si el pin no coincide con los bytes.")
    parser.add_argument("--actualizar", action="store_true", help="Reescribe el pin del mismo año si los bytes cambiaron.")
    parser.add_argument(
        "--establecer-actual",
        action="store_true",
        help="Deja data/versiones.json actual apuntando a este año.",
    )
    args = parser.parse_args()

    reporte = json.loads(REPORTE.read_text(encoding="utf-8"))
    declarado = anio_del_reporte(reporte)
    anio = args.anio or declarado
    if not re.fullmatch(r"\d{4}", anio):
        raise SystemExit("--anio debe tener 4 dígitos.")
    if anio != declarado:
        raise SystemExit(
            f"El reporte describe límites actualizados al {declarado}, no al {anio}. "
            "Regenera la base antes de publicar otro año."
        )

    artefactos = inventario()
    destino = RAIZ / "data" / f"v{anio}" / "MANIFEST.json"
    if destino.is_file():
        previo = json.loads(destino.read_text(encoding="utf-8"))
        cambios = diferencias(previo.get("artefactos", []), artefactos)
    else:
        previo = None
        cambios = ["manifiesto ausente"]

    if args.comprobar:
        if cambios:
            print(f"El pin data/v{anio}/MANIFEST.json no coincide:", file=sys.stderr)
            for linea in cambios:
                print(f"  - {linea}", file=sys.stderr)
            print("Si el cambio es intencional: python scripts/congelar_version.py --actualizar", file=sys.stderr)
            return 1
        print(f"data/v{anio} coincide ({len(artefactos)} artefactos).")
        return 0

    if previo and cambios and not args.actualizar:
        print(f"data/v{anio} ya está congelado y los bytes cambiaron:", file=sys.stderr)
        for linea in cambios:
            print(f"  - {linea}", file=sys.stderr)
        print("Usa --actualizar para reescribir este año, o publica otro año cuando el INEI cambie la base.", file=sys.stderr)
        return 1

    if previo and not cambios:
        print(f"data/v{anio} ya coincide. No se reescribió.")
        return 0

    congelado = date.today().isoformat() if previo is None or args.actualizar else str(previo.get("congelado_en"))
    manifiesto = construir_manifiesto(anio, reporte, artefactos, congelado)
    escribir(destino, manifiesto)
    establecer = args.establecer_actual or not VERSIONES.is_file()
    escribir(VERSIONES, actualizar_catalogo(anio, manifiesto["conteos"], establecer))
    print(f"Congelado data/v{anio} ({len(artefactos)} artefactos, {congelado}).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
