import type { NivelGeo } from "@/lib/datos/repositorio";
import { geoFiltrado, SolicitudInvalida } from "@/lib/datos/repositorio";
import { leerParametros, nivelGeo } from "@/lib/consultas";
import { jsonError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

const mapa: Record<string, NivelGeo> = {
  departamentos: "departamental",
  provincias: "provincial",
  distritos: "distrital",
  capitales: "capitales",
};

interface Contexto {
  params: Promise<{ nivel: string }>;
}

export async function GET(request: Request, contexto: Contexto): Promise<Response> {
  try {
    const { nivel } = await contexto.params;
    const parsed = nivelGeo.safeParse(nivel);
    if (!parsed.success) {
      throw new SolicitudInvalida("Nivel desconocido.");
    }
    const params = leerParametros(request);
    const dep = params.get("dep") ?? undefined;
    const prov = params.get("prov") ?? undefined;
    const ubigeo = prov ?? dep ?? undefined;
    if (dep && !/^\d{2}$/.test(dep)) {
      throw new SolicitudInvalida("dep debe tener 2 dígitos.");
    }
    if (prov && !/^\d{4}$/.test(prov)) {
      throw new SolicitudInvalida("prov debe tener 4 dígitos.");
    }
    return jsonOk(geoFiltrado(mapa[parsed.data], ubigeo));
  } catch (error) {
    return jsonError(error);
  }
}
