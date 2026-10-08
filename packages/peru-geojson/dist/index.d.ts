import { PropiedadesCanonicas, IndiceUbigeo } from './contrato.js';
export { ATRIBUCION, BBox, ColeccionUbigeo, Departamento as DepartamentoRegistro, Distrito as DistritoRegistro, FeatureUbigeo, LICENCIA_DATOS, LICENCIA_DATOS_URL, MetadataGeo, Provincia as ProvinciaRegistro, RegistroUbigeo } from './contrato.js';

/**
 * Tipos públicos de la librería sobre el esquema canónico nuevo
 * (ubigeo + nombre_* en minúsculas, ver contrato.ts). Todo tipado, sin `any`.
 */
type UbigeoDep = string;
type UbigeoProv = string;
type UbigeoDist = string;
type Ubigeo = UbigeoDep | UbigeoProv | UbigeoDist;
/** Nivel para selección de capa (visor/API). */
type Nivel = "departamental" | "provincial" | "distrital" | "capitales";
/** Nivel según longitud de ubigeo. */
type NivelUbigeo = "departamental" | "provincial" | "distrital";
type GeoPolygon = GeoJSON.Polygon | GeoJSON.MultiPolygon;
interface DepartamentoProps extends PropiedadesCanonicas {
    ubigeo: UbigeoDep;
}
interface ProvinciaProps extends PropiedadesCanonicas {
    ubigeo: UbigeoProv;
}
interface DistritoProps extends PropiedadesCanonicas {
    ubigeo: UbigeoDist;
}
interface CapitalProps extends PropiedadesCanonicas {
    ubigeo: UbigeoProv;
}
type DepartamentoFeature = GeoJSON.Feature<GeoPolygon, DepartamentoProps>;
type ProvinciaFeature = GeoJSON.Feature<GeoPolygon, ProvinciaProps>;
type DistritoFeature = GeoJSON.Feature<GeoPolygon, DistritoProps>;
type CapitalFeature = GeoJSON.Feature<GeoJSON.Point, CapitalProps>;
type AnyProps = DepartamentoProps | ProvinciaProps | DistritoProps | CapitalProps;
type AnyFeature = GeoJSON.Feature<GeoJSON.Geometry, AnyProps>;
interface Stats {
    departamental: {
        ok: number;
    };
    provincial: {
        ok: number;
    };
    distrital: {
        ok: number;
    };
    capitales: {
        ok: number;
    };
}

interface FiltroGeo {
    /** Ubigeo de departamento (2 dígitos): filtra por prefijo. */
    dep?: string | null;
    /** Ubigeo de provincia (4 dígitos). Solo aplica a distrital. */
    prov?: string | null;
    /** Texto libre: nombre o fragmento de ubigeo. */
    q?: string | null;
    nivel: Nivel;
}
/**
 * Filtra features en memoria por departamento/provincia + búsqueda.
 * Función pura: no muta el array de entrada.
 */
declare function filtrarFeatures(features: AnyFeature[], filtro: FiltroGeo): AnyFeature[];
/** Atajo: solo búsqueda por texto, sin filtro geográfico. */
declare function buscarPorNombre(features: AnyFeature[], query: string, nivel: Nivel): AnyFeature[];

/** Normaliza texto para búsqueda: minúsculas, sin tildes, espacios simples. */
declare function normalizarTexto(s: string): string;
/** ¿Tiene forma válida de ubigeo? (2, 4 o 6 dígitos). No verifica existencia. */
declare function esUbigeoValido(ubigeo: string): ubigeo is Ubigeo;
/** Nivel geográfico según longitud del ubigeo. Retorna null si es inválido. */
declare function nivelDeUbigeo(ubigeo: string): NivelUbigeo | null;
/** Ubigeo del padre directo: distrito→provincia, provincia→departamento, dep→null. */
declare function ubigeoPadre(ubigeo: string): string | null;
/** ¿`child` pertenece a `parent`? Ej. perteneceA("150137", "15") === true. */
declare function perteneceA(child: string, parent: string): boolean;

type DepartamentalFC = GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon, DepartamentoFeature["properties"]>;
type ProvincialFC = GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon, ProvinciaFeature["properties"]>;
type DistritalFC = GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon, DistritoFeature["properties"]>;
type CapitalesFC = GeoJSON.FeatureCollection<GeoJSON.Point, CapitalFeature["properties"]>;
/** Carga la versión liviana incluida en el paquete. */
declare function loadDepartamental(): Promise<DepartamentalFC>;
declare function loadProvincial(): Promise<ProvincialFC>;
declare function loadDistrital(): Promise<DistritalFC>;
declare function loadCapitales(): Promise<CapitalesFC>;
declare function loadUbigeoIndex(): Promise<IndiceUbigeo>;
/** Conteos derivados del índice + capitales (fuente única, sin STATS duplicado). */
declare function loadStats(): Promise<Stats>;
/** Carga genérica por nivel. Útil para visores y APIs. */
declare function loadNivel(nivel: Nivel): Promise<GeoJSON.FeatureCollection>;

/** Un distrito puede no tener dato: el join es LEFT, nunca inventa. */
interface IndicadorSociodemografico {
    poblacion: number;
    hogares: number;
    pobreza_pct?: number;
    idh?: number;
    anio?: number;
    fuente?: string;
    sintetico?: boolean;
}
interface IndicadorGeometrico {
    area_km2: number;
    centroide: [number, number];
    n_vertices: number;
}
type EstadoIndicadores = "pendiente-oficial" | "oficial" | "demo-sintetico";
interface TablaIndicadores {
    meta: {
        estado: EstadoIndicadores;
        [k: string]: unknown;
    };
    registros: Record<string, IndicadorSociodemografico>;
}
interface TablaGeometria {
    meta: {
        estado: string;
        [k: string]: unknown;
    };
    niveles: Record<string, Record<string, IndicadorGeometrico>>;
}
declare function loadIndicadoresSocio(): Promise<TablaIndicadores>;
declare function loadIndicadoresDemo(): Promise<TablaIndicadores>;
declare function loadIndicadoresGeo(): Promise<TablaGeometria>;
/**
 * LEFT JOIN de indicadores sobre features. No muta la entrada:
 * retorna features nuevas con `indicadores` (o null si no hay dato).
 */
declare function joinIndicadores(features: AnyFeature[], tabla: TablaIndicadores): AnyFeature[];
/** Cobertura del join: cuántos features tienen dato. */
declare function coberturaIndicadores(features: AnyFeature[], tabla: TablaIndicadores): {
    total: number;
    conDatos: number;
    pct: number;
};

interface Punto {
    lng: number;
    lat: number;
}
interface ResultadoInverso {
    ubigeo: string;
    nivel: "departamental" | "provincial" | "distrital";
    properties: AnyFeature["properties"];
    /** true = el punto cae dentro; false = es el más cercano (fallback). */
    exacto: boolean;
}
type Anillo = number[][];
/** Ray casting sobre un anillo. Frontera = dentro. */
declare function puntoEnAnillo(anillo: Anillo, p: Punto): boolean;
/** Dentro del exterior y fuera de todos los huecos. */
declare function puntoEnPoligono(geom: GeoJSON.Polygon | GeoJSON.MultiPolygon, p: Punto): boolean;
/**
 * Geocodificación inversa: punto → ubigeo del distrito que lo contiene.
 * Grueso-a-fino con bbox (del feature o calculada). Sin dependencias.
 * Con `fallback: "mas-cercano"` retorna el centroide más próximo si no hay
 * contención (útil en mar/frontera); si no, retorna null. Requiere tabla
 * de `loadIndicadoresGeo()` para el fallback.
 */
declare function reverseGeocode(features: AnyFeature[], punto: Punto, opciones?: {
    fallback?: "mas-cercano" | null;
    centroides?: Record<string, [number, number]>;
}): ResultadoInverso | null;

interface TablasNombres {
    sobreescrituras: Record<string, string>;
    gentilicios: Record<string, string | null>;
}
/** Carga sobreescrituras verificadas + gentilicios incluidos en el paquete. */
declare function loadNombres(): Promise<TablasNombres>;
/**
 * Nombre presentable desde minúsculas sin tildes.
 * 1) override verificado gana; 2) Title-Case con conectores en minúscula
 * y romanos en mayúscula. Las tildes impredecibles van al archivo, no a reglas.
 */
declare function aNombreOficial(minusculas: string, overrides?: Record<string, string>): string;
/** Gentilicio verificado o null (nunca inventa). Clave en minúsculas sin tildes. */
declare function gentilicio(nombreMinusculas: string, mapa?: Record<string, string | null>): string | null;

export { type AnyFeature, type AnyProps, type CapitalFeature, type CapitalProps, type CapitalesFC as CapitalesCollection, type DepartamentalFC as DepartamentalCollection, type DepartamentoFeature, type DepartamentoProps, type DistritalFC as DistritalCollection, type DistritoFeature, type DistritoProps, type EstadoIndicadores, type FiltroGeo, type IndicadorGeometrico, type IndicadorSociodemografico, IndiceUbigeo, type Nivel, type NivelUbigeo, PropiedadesCanonicas, type ProvinciaFeature, type ProvinciaProps, type ProvincialFC as ProvincialCollection, type Punto, type ResultadoInverso, type Stats, type TablaGeometria, type TablaIndicadores, type TablasNombres, type Ubigeo, type UbigeoDep, type UbigeoDist, IndiceUbigeo as UbigeoIndex, type UbigeoProv, aNombreOficial, buscarPorNombre, coberturaIndicadores, esUbigeoValido, filtrarFeatures, gentilicio, joinIndicadores, loadCapitales, loadDepartamental, loadDistrital, loadIndicadoresDemo, loadIndicadoresGeo, loadIndicadoresSocio, loadNivel, loadNombres, loadProvincial, loadStats, loadUbigeoIndex, nivelDeUbigeo, normalizarTexto, perteneceA, puntoEnAnillo, puntoEnPoligono, reverseGeocode, ubigeoPadre };
