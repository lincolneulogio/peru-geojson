import { distritos, fuenteDatos, SolicitudInvalida } from "@/lib/datos/repositorio";
import { consultaDistritos, leerParametros } from "@/lib/consultas";
import { jsonError, jsonOk } from "@/lib/http";
import { aColeccion } from "@/lib/recursos/ubigeo";

export const runtime = "nodejs";

export function GET(request: Request): Response {
  try {
    const params = leerParametros(request);
    const parsed = consultaDistritos.safeParse({
      dep: params.get("dep") ?? undefined,
      prov: params.get("prov") ?? undefined,
    });
    if (!parsed.success) {
      throw new SolicitudInvalida("Usa /api/distritos?prov=1501 o /api/distritos?dep=15.");
    }
    return jsonOk(aColeccion(distritos(parsed.data), fuenteDatos()));
  } catch (error) {
    return jsonError(error);
  }
}
