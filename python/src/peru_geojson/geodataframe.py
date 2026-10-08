"""GeoDataFrame opcional. Requiere `pip install peru-geojson[gis]`."""
from __future__ import annotations

from typing import TYPE_CHECKING

from peru_geojson.contrato import NivelCapa
from peru_geojson.paths import data_dir

if TYPE_CHECKING:
    import geopandas


def a_geodataframe(nivel: NivelCapa) -> geopandas.GeoDataFrame:
    try:
        import geopandas as gpd
    except ImportError as exc:
        raise ImportError("Instala el extra: pip install 'peru-geojson[gis]'") from exc
    ruta = data_dir() / "derived" / f"peru-{nivel}.min.geojson"
    return gpd.read_file(ruta)
