import { fuenteDatos, departamentos } from "@/lib/datos/repositorio";
import { jsonError, jsonOk } from "@/lib/http";
import { aColeccion } from "@/lib/recursos/ubigeo";

export const runtime = "nodejs";

export function GET(): Response {
  try {
    return jsonOk(aColeccion(departamentos(), fuenteDatos()));
  } catch (error) {
    return jsonError(error);
  }
}
