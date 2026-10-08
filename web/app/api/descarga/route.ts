import { geoFiltrado, SolicitudInvalida } from "@/lib/datos/repositorio";
import { consultaDescarga, leerParametros } from "@/lib/consultas";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";

export function GET(request: Request): Response {
  try {
    const params = leerParametros(request);
    const parsed = consultaDescarga.safeParse({
      nivel: params.get("nivel") ?? "",
      ubigeo: params.get("ubigeo") ?? undefined,
    });
    if (!parsed.success) {
      throw new SolicitudInvalida(
        "Usa /api/descarga?nivel=distrital&ubigeo=1501. Niveles: departamental, provincial, distrital, capitales.",
      );
    }
    const coleccion = geoFiltrado(parsed.data.nivel, parsed.data.ubigeo);
    const sufijo = parsed.data.ubigeo ? `-${parsed.data.ubigeo}` : "";
    const nombre = `peru-${parsed.data.nivel}${sufijo}.geojson`;
    return new Response(JSON.stringify(coleccion), {
      headers: {
        "Content-Type": "application/geo+json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${nombre}"`,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
