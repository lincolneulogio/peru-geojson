import { PropiedadesCanonicas, IndiceUbigeo } from './contrato.cjs';
export { ATRIBUCION, BBox, ColeccionUbigeo, Departamento as DepartamentoRegistro, Distrito as DistritoRegistro, FeatureUbigeo, LICENCIA_DATOS, LICENCIA_DATOS_URL, MetadataGeo, Provincia as ProvinciaRegistro, RegistroUbigeo } from './contrato.cjs';

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

export { type AnyFeature, type AnyProps, type CapitalFeature, type CapitalProps, type CapitalesFC as CapitalesCollection, type DepartamentalFC as DepartamentalCollection, type DepartamentoFeature, type DepartamentoProps, type DistritalFC as DistritalCollection, type DistritoFeature, type DistritoProps, type FiltroGeo, IndiceUbigeo, type Nivel, type NivelUbigeo, PropiedadesCanonicas, type ProvinciaFeature, type ProvinciaProps, type ProvincialFC as ProvincialCollection, type Stats, type Ubigeo, type UbigeoDep, type UbigeoDist, IndiceUbigeo as UbigeoIndex, type UbigeoProv, buscarPorNombre, esUbigeoValido, filtrarFeatures, loadCapitales, loadDepartamental, loadDistrital, loadNivel, loadProvincial, loadStats, loadUbigeoIndex, nivelDeUbigeo, normalizarTexto, perteneceA, ubigeoPadre };
