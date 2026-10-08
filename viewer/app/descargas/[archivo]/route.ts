import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { raizDelRepositorio } from "@/lib/server/datos";

export const runtime = "nodejs";

const ARCHIVOS: Record<string, { relativo: string; tipo: string }> = {
  "departamentos.geojson": { relativo: "data/variants/light/departamentos.geojson", tipo: "application/geo+json" },
  "provincias.geojson": { relativo: "data/variants/light/provincias.geojson", tipo: "application/geo+json" },
  "distritos.geojson": { relativo: "data/variants/light/distritos.geojson", tipo: "application/geo+json" },
  "capitales.geojson": { relativo: "data/variants/light/capitales.geojson", tipo: "application/geo+json" },
  "peru.topojson": { relativo: "data/variants/peru.topojson", tipo: "application/json" },
  "peru-ubigeo.pmtiles": { relativo: "data/variants/peru-ubigeo.pmtiles", tipo: "application/vnd.pmtiles" },
  "MANIFEST.json": { relativo: "data/variants/MANIFEST.json", tipo: "application/json" },
};

interface RutaDescarga {
  params: Promise<{ archivo: string }>;
}

export async function GET(request: Request, contexto: RutaDescarga): Promise<Response> {
  const { archivo } = await contexto.params;
  const descrito = ARCHIVOS[archivo];
  if (!descrito) {
    return Response.json({ error: "Archivo no publicado." }, { status: 404 });
  }
  const absoluto = path.join(raizDelRepositorio(), descrito.relativo);
  const info = await stat(absoluto);
  const rango = request.headers.get("range");
  const comun = {
    "Content-Type": descrito.tipo,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=86400",
    "Access-Control-Allow-Origin": "*",
  };
  if (rango) {
    const coincidencia = /^bytes=(\d+)-(\d*)$/.exec(rango);
    if (!coincidencia || coincidencia[1] === undefined) {
      return new Response(null, { status: 416, headers: { ...comun, "Content-Range": `bytes */${info.size}` } });
    }
    const inicio = Number(coincidencia[1]);
    const fin = coincidencia[2] ? Number(coincidencia[2]) : info.size - 1;
    if (inicio > fin || fin >= info.size) {
      return new Response(null, { status: 416, headers: { ...comun, "Content-Range": `bytes */${info.size}` } });
    }
    const stream = createReadStream(absoluto, { start: inicio, end: fin });
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: {
        ...comun,
        "Content-Range": `bytes ${inicio}-${fin}/${info.size}`,
        "Content-Length": String(fin - inicio + 1),
      },
    });
  }
  const stream = createReadStream(absoluto);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: { ...comun, "Content-Length": String(info.size) },
  });
}
