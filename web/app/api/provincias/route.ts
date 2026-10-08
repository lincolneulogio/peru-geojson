import { fuenteDatos, provincias, SolicitudInvalida } from "@/lib/datos/repositorio";
import { consultaDep, leerParametros } from "@/lib/consultas";
import { jsonError, jsonOk } from "@/lib/http";
import { aColeccion } from "@/lib/recursos/ubigeo";

export const runtime = "nodejs";

export function GET(request: Request): Response {
  try {
    const parsed = consultaDep.safeParse({
      dep: leerParametros(request).get("dep") ?? "",
    });
    if (!parsed.success) {
      throw new SolicitudInvalida("Usa /api/provincias?dep=15 con el ubigeo de 2 dígitos.");
    }
    return jsonOk(aColeccion(provincias(parsed.data.dep), fuenteDatos()));
  } catch (error) {
    return jsonError(error);
  }
}
