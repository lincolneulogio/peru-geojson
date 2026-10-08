"""Siembra inicial de indicadores y nombres (una sola vez, auditable).

Genera:
- data/indicadores/demo-sintetico.json (VALORES FALSOS deterministas, solo demos UI)
- data/indicadores/sociodemograficos.json (vacío válido, estado pendiente-oficial)
- data/indicadores/schema.json (contrato de validación)
- data/nombres/sobreescrituras.json (solo entradas verificadas contra datos)
- data/nombres/gentilicios.json (null = no verificado, la función retorna null)

Uso: python scripts/sembrar_demo.py
"""
from __future__ import annotations

import hashlib
import json
import pathlib
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parent.parent
IND = ROOT / "data" / "indicadores"
NOM = ROOT / "data" / "nombres"


def h(ubigeo: str, semilla: str) -> int:
    return int(hashlib.sha256(f"{ubigeo}:{semilla}".encode()).hexdigest()[:8], 16)


def socio_falso(ubigeo: str) -> dict:
    return {
        "poblacion": 800 + h(ubigeo, "pob") % 420000,
        "hogares": 200 + h(ubigeo, "hog") % 110000,
        "pobreza_pct": round(5 + (h(ubigeo, "pob2") % 8000) / 100, 1),
        "idh": round(0.30 + (h(ubigeo, "idh") % 5000) / 10000, 3),
        "anio": 2017,
        "sintetico": True,
    }


SOBREESCRITURAS = {
    "amazonas": "Amazonas", "ancash": "Áncash", "apurimac": "Apurímac",
    "arequipa": "Arequipa", "ayacucho": "Ayacucho", "cajamarca": "Cajamarca",
    "callao": "Callao", "cusco": "Cusco", "huancavelica": "Huancavelica",
    "huanuco": "Huánuco", "ica": "Ica", "junin": "Junín",
    "la libertad": "La Libertad", "lambayeque": "Lambayeque", "lima": "Lima",
    "loreto": "Loreto", "madre de dios": "Madre de Dios", "moquegua": "Moquegua",
    "pasco": "Pasco", "piura": "Piura", "puno": "Puno",
    "san martin": "San Martín", "tacna": "Tacna", "tumbes": "Tumbes",
    "ucayali": "Ucayali", "san martin de porres": "San Martín de Porres",
    "maria": "María", "santa maria": "Santa María",
}

GENTILICIOS = {
    "amazonas": "amazónico", "ancash": "ancashino", "apurimac": "apurimeño",
    "arequipa": "arequipeño", "ayacucho": "ayacuchano", "cajamarca": "cajamarquino",
    "callao": "chalaco", "cusco": "cusqueño", "huancavelica": "huancavelicano",
    "huanuco": "huanuqueño", "ica": "iqueño", "junin": "juninense",
    "la libertad": "liberteño", "lambayeque": "lambayecano", "lima": "limeño",
    "loreto": "loretano", "madre de dios": None, "moquegua": "moqueguano",
    "pasco": "pasqueño", "piura": "piurano", "puno": "puneño",
    "san martin": "sanmartinense", "tacna": "tacneño", "tumbes": "tumbesino",
    "ucayali": "ucayalino",
}


def main() -> None:
    IND.mkdir(parents=True, exist_ok=True)
    NOM.mkdir(parents=True, exist_ok=True)
    ubigeos = json.loads((ROOT / "data" / "ubigeo.json").read_text(encoding="utf-8"))

    # 1. Verificar overrides contra datos reales (no inventar claves)
    todos = (
        [d["nombre_departamento"] for d in ubigeos["departamentos"]]
        + [p["nombre_provincia"] for p in ubigeos["provincias"]]
        + [d["nombre_distrito"] for d in ubigeos["distritos"]]
    )
    for clave in SOBREESCRITURAS:
        assert clave in todos, f"override sin respaldo en datos: {clave}"
    assert set(GENTILICIOS) == {d["nombre_departamento"] for d in ubigeos["departamentos"]}

    ahora = datetime.now(timezone.utc).isoformat()
    (IND / "demo-sintetico.json").write_text(json.dumps({
        "meta": {
            "estado": "demo-sintetico",
            "advertencia": "VALORES FALSOS deterministas solo para demos de UI. Jamas usar como dato real.",
            "generado_en": ahora,
        },
        "registros": {d["ubigeo"]: socio_falso(d["ubigeo"]) for d in ubigeos["distritos"]},
    }, ensure_ascii=False), encoding="utf-8")

    (IND / "sociodemograficos.json").write_text(json.dumps({
        "meta": {
            "estado": "pendiente-oficial",
            "fuentes_requeridas": ["Censo Nacional 2017 (INEI)", "ENAHO / Mapa de Pobreza (INEI)", "IDH distrital (PNUD)"],
            "formato_csv": "ubigeo,poblacion,hogares,pobreza_pct,idh,anio,fuente",
            "cargador": "python scripts/importar_indicadores.py sources/indicadores/xxx.csv",
        },
        "registros": {},
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    schema_key = "$schema"
    (IND / "schema.json").write_text(json.dumps({
        schema_key: "http://json-schema.org/draft-07/schema#",
        "title": "Indicadores por ubigeo",
        "type": "object",
        "required": ["meta", "registros"],
        "properties": {
            "meta": {"type": "object", "required": ["estado"],
                     "properties": {"estado": {"enum": ["pendiente-oficial", "oficial", "demo-sintetico"]}}},
            "registros": {"type": "object", "additionalProperties": {
                "type": "object", "required": ["poblacion", "hogares"],
                "properties": {
                    "poblacion": {"type": "integer", "minimum": 0},
                    "hogares": {"type": "integer", "minimum": 0},
                    "pobreza_pct": {"type": "number", "minimum": 0, "maximum": 100},
                    "idh": {"type": "number", "minimum": 0, "maximum": 1},
                    "anio": {"type": "integer"}, "sintetico": {"type": "boolean"},
                }}},
        },
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    (NOM / "sobreescrituras.json").write_text(json.dumps({
        "nota": "Claves en minusculas sin tildes (formato del pipeline). Solo entradas verificadas; el resto lo resuelven las reglas de aNombreOficial. Contribuir: docs/NOMBRES.md",
        "sobreescrituras": SOBREESCRITURAS,
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    (NOM / "gentilicios.json").write_text(json.dumps({
        **GENTILICIOS,
        "_nota": "null = gentilicio no verificado; la funcion retorna null en vez de inventar. Contribuir: docs/NOMBRES.md",
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print("OK semillas verificadas contra datos")


if __name__ == "__main__":
    main()
