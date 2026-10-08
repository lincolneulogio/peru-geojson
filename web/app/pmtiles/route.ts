import { opcionesPmtiles, responderPmtiles } from "@/lib/pmtiles/archivo";

export const runtime = "nodejs";

export function GET(request: Request): Promise<Response> {
  return responderPmtiles(request, "variants", "peru-ubigeo.pmtiles");
}

export function HEAD(request: Request): Promise<Response> {
  return responderPmtiles(request, "variants", "peru-ubigeo.pmtiles");
}

export function OPTIONS(): Response {
  return opcionesPmtiles();
}
