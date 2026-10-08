import { buscar, fuenteDatos, SolicitudInvalida } from "@/lib/datos/repositorio";
import { consultaBusqueda, leerParametros } from "@/lib/consultas";
import { jsonError, jsonOk } from "@/lib/http";
import { aColeccion } from "@/lib/recursos/ubigeo";

export const runtime = "nodejs";

export function GET(request: Request): Response {
  try {
    const parsed = consultaBusqueda.safeParse({
      q: leerParametros(request).get("q") ?? "",
    });
    if (!parsed.success) {
      throw new SolicitudInvalida("Usa /api/ubigeo?q=1501 o un nombre de al menos 2 caracteres.");
    }
    return jsonOk(aColeccion(buscar(parsed.data.q), fuenteDatos()));
  } catch (error) {
    return jsonError(error);
  }
}
