import { leerManifiesto } from "@/lib/datos/versiones";
import { jsonOk } from "@/lib/http";

export const runtime = "nodejs";

interface Contexto {
  params: Promise<{ anio: string }>;
}

export async function GET(_request: Request, contexto: Contexto): Promise<Response> {
  const { anio } = await contexto.params;
  const manifiesto = leerManifiesto(anio);
  if (!manifiesto) {
    return Response.json({ error: { message: `No hay pin cartográfico para ${anio}.` } }, { status: 404 });
  }
  return jsonOk(manifiesto);
}
