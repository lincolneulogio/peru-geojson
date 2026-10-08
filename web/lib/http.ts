import { SolicitudInvalida } from "@/lib/datos/repositorio";

export function jsonOk(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}

export function jsonError(error: unknown): Response {
  if (error instanceof SolicitudInvalida) {
    return Response.json({ error: { message: error.message } }, { status: 400 });
  }
  return Response.json({ error: { message: "No se pudo leer el catálogo." } }, { status: 500 });
}
