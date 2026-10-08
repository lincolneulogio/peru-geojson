import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from peru_geojson import (  # noqa: E402
    a_geodataframe,
    a_nombre_oficial,
    altitud_centroide,
    buscar_por_nombre,
    cambios_ubigeo,
    contenedor_geometrico,
    cobertura_indicadores,
    cruce_ubigeo,
    es_ubigeo_valido,
    filtrar_features,
    gentilicio,
    join_indicadores,
    load_equivalencias,
    load_espacial_distritos,
    load_nombres,
    load_stats,
    load_ubigeo_index,
    nivel_de_ubigeo,
    normalizar_texto,
    pertenece_a,
    ubigeo_equivalente,
    ubigeo_padre,
    vecinos_de,
)


class UbigeoTest(unittest.TestCase):
    def test_longitudes(self) -> None:
        self.assertTrue(es_ubigeo_valido("15"))
        self.assertTrue(es_ubigeo_valido("1501"))
        self.assertTrue(es_ubigeo_valido("150137"))
        self.assertFalse(es_ubigeo_valido("15013"))
        self.assertFalse(es_ubigeo_valido("AB"))

    def test_nivel_y_padre(self) -> None:
        self.assertEqual(nivel_de_ubigeo("15"), "departamental")
        self.assertEqual(nivel_de_ubigeo("1501"), "provincial")
        self.assertEqual(nivel_de_ubigeo("150137"), "distrital")
        self.assertEqual(ubigeo_padre("150137"), "1501")
        self.assertEqual(ubigeo_padre("1501"), "15")
        self.assertIsNone(ubigeo_padre("15"))

    def test_pertenece(self) -> None:
        self.assertTrue(pertenece_a("150137", "15"))
        self.assertTrue(pertenece_a("150137", "1501"))
        self.assertFalse(pertenece_a("1501", "150137"))

    def test_normaliza(self) -> None:
        self.assertEqual(normalizar_texto("SAN MARTÍN  De Porres"), "san martin de porres")


class SearchTest(unittest.TestCase):
    def test_filtro(self) -> None:
        features = [
            {"type": "Feature", "properties": {"ubigeo": "15", "nombre_departamento": "lima"}, "geometry": None},
            {"type": "Feature", "properties": {"ubigeo": "07", "nombre_departamento": "callao"}, "geometry": None},
        ]
        self.assertEqual(len(filtrar_features(features, {"nivel": "departamental", "dep": "15"})), 1)
        self.assertEqual(len(buscar_por_nombre(features, "callao", "departamental")), 1)
        self.assertEqual(len(buscar_por_nombre(features, "cusco", "departamental")), 0)


class IndiceTest(unittest.TestCase):
    def test_conteos(self) -> None:
        indice = load_ubigeo_index()
        stats = load_stats()
        self.assertEqual(len(indice["departamentos"]), 25)
        self.assertEqual(len(indice["provincias"]), 196)
        self.assertEqual(len(indice["distritos"]), 1890)
        self.assertEqual(stats["capitales"]["ok"], 194)
        self.assertEqual(indice["crs"], "EPSG:4326")


class EquivalenciasTest(unittest.TestCase):
    def test_cruce_conocido(self) -> None:
        tabla = load_equivalencias()
        resumen = tabla["resumen"]["distrito"]
        self.assertEqual(resumen["2007"], 1834)
        self.assertEqual(resumen["2026"], 1890)
        self.assertEqual(resumen["creado"], 56)
        self.assertEqual(resumen["reasignado"], 2)
        self.assertEqual(resumen["renombrado"], 15)
        self.assertEqual(resumen["sin_par_2026"], 0)
        self.assertEqual(ubigeo_equivalente(tabla, "160109", "2007"), "160801")
        self.assertIsNone(ubigeo_equivalente(tabla, "070107", "2026"))
        self.assertEqual(contenedor_geometrico(tabla, "070107"), "070106")
        fila = cruce_ubigeo(tabla, "150121", "2026")
        self.assertIsNotNone(fila)
        assert fila is not None
        self.assertEqual(fila["tipo"], "renombrado")
        self.assertEqual(fila["nombre_2007"], "magdalena vieja")
        self.assertEqual(fila["nombre_2026"], "pueblo libre")
        self.assertEqual(len(cambios_ubigeo(tabla)), 76)
        self.assertEqual(tabla["resumen"]["provincia"]["creado"], 1)


class EspacialTest(unittest.TestCase):
    def test_vecinos_y_altitud(self) -> None:
        tabla = load_espacial_distritos()
        self.assertEqual(tabla["meta"]["n"], 1890)
        punta = vecinos_de(tabla, "070105")
        self.assertIn("070101", punta)
        self.assertEqual(vecinos_de(tabla, "210103"), [])
        self.assertEqual(vecinos_de(tabla, "211302"), [])
        lima = tabla["distritos"]["150101"]
        self.assertIsInstance(lima["altitud_centroide_m"], int)
        self.assertGreater(altitud_centroide(tabla, "150101") or 0, 0)
        self.assertLess(lima["altitud_centroide_m"] or 0, 500)
        for ubigeo, rec in tabla["distritos"].items():
            for vecino in rec["vecinos"]:
                self.assertIn(ubigeo, tabla["distritos"][vecino]["vecinos"])


class NombresTest(unittest.TestCase):
    def test_override_y_gentilicio(self) -> None:
        tablas = load_nombres()
        self.assertEqual(a_nombre_oficial("san martin de porres", tablas["sobreescrituras"]), "San Martín de Porres")
        self.assertEqual(a_nombre_oficial("santa rosa de lima", {}), "Santa Rosa de Lima")
        self.assertEqual(gentilicio("lima", tablas["gentilicios"]), "limeño")
        self.assertIsNone(gentilicio("inventado", tablas["gentilicios"]))


class IndicadoresTest(unittest.TestCase):
    def test_left_join(self) -> None:
        features = [
            {"type": "Feature", "properties": {"ubigeo": "150101"}, "geometry": None},
            {"type": "Feature", "properties": {"ubigeo": "150102"}, "geometry": None},
        ]
        tabla = {"meta": {"estado": "demo"}, "registros": {"150101": {"poblacion": 1000, "hogares": 300}}}
        unido = join_indicadores(features, tabla)
        self.assertNotIn("indicadores", features[0]["properties"])
        props = unido[0]["properties"]
        assert isinstance(props, dict)
        indicador = props["indicadores"]
        assert isinstance(indicador, dict)
        self.assertEqual(indicador["poblacion"], 1000)
        self.assertIsNone(unido[1]["properties"]["indicadores"])  # type: ignore[index]
        self.assertEqual(cobertura_indicadores(features, tabla)["conDatos"], 1)


class GeoPandasTest(unittest.TestCase):
    def test_departamentos_si_esta_instalado(self) -> None:
        try:
            import geopandas  # noqa: F401
        except ImportError:
            self.skipTest("geopandas no instalado")
        marco = a_geodataframe("departamental")
        self.assertEqual(len(marco), 25)


if __name__ == "__main__":
    unittest.main()
