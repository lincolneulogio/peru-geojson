import { leerVersiones } from "@/lib/datos/versiones";
import { jsonError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

export function GET(): Response {
  try {
    return jsonOk(leerVersiones());
  } catch (error) {
    return jsonError(error);
  }
}
