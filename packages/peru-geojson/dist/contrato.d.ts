/**
 * Contrato canónico de la librería peru-geojson.
 * Nombres en minúsculas, sin tildes. Los alias legacy viven en `alias`.
 */
declare const LICENCIA_DATOS: "CC-BY-4.0";
declare const LICENCIA_DATOS_URL = "https://creativecommons.org/licenses/by/4.0/";
declare const ATRIBUCION = "Instituto Nacional de Estad\u00EDstica e Inform\u00E1tica (INEI). L\u00EDmites departamentales, provinciales y distritales: IDE-INEI, actualizaci\u00F3n 2023. Capitales de provincia: Infraestructura de Datos Espaciales del Per\u00FA (IDEP), 2016.";
type BBox = [number, number, number, number];
type NivelUbigeo = "departamento" | "provincia" | "distrito";
interface AliasLegacy {
    NOMBDEP?: string;
    FIRST_IDDP?: string;
    NOMBPROV?: string;
    FIRST_IDPR?: string;
    FIRST_NOMB?: string;
    NOMBDIST?: string;
    IDDIST?: string;
    IDDPTO?: string;
    IDPROV?: string;
    NOM_CAP?: string;
    CAPITAL?: string;
    DEPARTAM?: string;
    PROVINCIA?: string;
    DISTRITO?: string;
    CCDD?: string;
    CCPP?: string;
    CCDI?: string;
}
interface PropiedadesCanonicas {
    ubigeo: string;
    nombre_departamento: string;
    nombre_provincia: string;
    nombre_distrito: string;
    capital: string;
}
interface PropiedadesValidadas extends PropiedadesCanonicas, AliasLegacy {
}
interface RegistroUbigeo extends PropiedadesCanonicas {
    nivel: NivelUbigeo;
    bbox: BBox;
    alias: AliasLegacy;
}
interface IndiceUbigeo {
    fuente: string;
    descarga_last_modified: string;
    crs: "EPSG:4326";
    departamentos: RegistroUbigeo[];
    provincias: RegistroUbigeo[];
    distritos: RegistroUbigeo[];
}
interface MetadataGeo {
    fuente: string;
    descarga_last_modified: string;
    portal: string;
    crs: "EPSG:4326";
    precision_decimales: number;
    simplificacion_grados: number;
    generado_por: string;
}
interface GeometriaPoligonal {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
}
interface GeometriaPunto {
    type: "Point";
    coordinates: [number, number];
}
interface FeatureUbigeo {
    type: "Feature";
    id: string;
    bbox?: BBox;
    properties: PropiedadesValidadas;
    geometry: GeometriaPoligonal | GeometriaPunto;
}
interface ColeccionUbigeo {
    type: "FeatureCollection";
    bbox: BBox;
    metadata: MetadataGeo;
    features: FeatureUbigeo[];
}
interface Departamento extends RegistroUbigeo {
    nivel: "departamento";
}
interface Provincia extends RegistroUbigeo {
    nivel: "provincia";
}
interface Distrito extends RegistroUbigeo {
    nivel: "distrito";
}

export { ATRIBUCION, type AliasLegacy, type BBox, type ColeccionUbigeo, type Departamento, type Distrito, type FeatureUbigeo, type GeometriaPoligonal, type GeometriaPunto, type IndiceUbigeo, LICENCIA_DATOS, LICENCIA_DATOS_URL, type MetadataGeo, type NivelUbigeo, type PropiedadesCanonicas, type PropiedadesValidadas, type Provincia, type RegistroUbigeo };
