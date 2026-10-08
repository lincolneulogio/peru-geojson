import { reverseGeocode } from "peru-geojson";
import {
  centroidesDistritales,
  fuenteDatos,
  geometriaDistrital,
  registroPorUbigeo,
  SolicitudInvalida,
} from "@/lib/datos/repositorio";
import { consultaReverse, leerParametros } from "@/lib/consultas";
import { jsonError, jsonOk } from "@/lib/http";
import { aRecurso } from "@/lib/recursos/ubigeo";

export const runtime = "nodejs";

/**
 * GET /api/reverse?lat=-12.0458&lng=-77.0318&cercano=1
 * Punto → distrito que lo contiene. Con cercano=1 retorna el más
 * próximo (por centroide) si el punto cae fuera (mar/frontera).
 */
export function GET(request: Request): Response {
  try {
    const params = leerParametros(request);
    const parsed = consultaReverse.safeParse({
      lat: params.get("lat") ?? "",
      lng: params.get("lng") ?? "",
      cercano: params.get("cercano") ?? undefined,
    });
    if (!parsed.success) {
      throw new SolicitudInvalida("Usa /api/reverse?lat=-12.0458&lng=-77.0318 (&cercano=1).");
    }
    const { lat, lng, cercano } = parsed.data;
    const geo = geometriaDistrital();
    const resultado = reverseGeocode(
      geo.features as never,
      { lng, lat },
      cercano === "1"
        ? { fallback: "mas-cercano", centroides: centroidesDistritales() }
        : { fallback: null },
    );
    if (!resultado) {
      return Response.json(
        { error: { message: "Ningún distrito contiene ese punto. Prueba con cercano=1." } },
        { status: 404 },
      );
    }
    const registro = registroPorUbigeo(resultado.ubigeo);
    if (!registro) {
      return Response.json({ error: { message: "Ubigeo sin registro en el índice." } }, { status: 404 });
    }
    return jsonOk({
      data: { ...aRecurso(registro), exacto: resultado.exacto },
      meta: { fuente: fuenteDatos(), crs: "EPSG:4326" as const },
    });
  } catch (error) {
    return jsonError(error);
  }
}
