import { open, stat } from "node:fs/promises";
import { rutaDatos } from "@/lib/datos/rutas";

const TIPO = "application/vnd.pmtiles";

function cabecerasComunes(tamano: number): Headers {
  return new Headers({
    "Content-Type": TIPO,
    "Accept-Ranges": "bytes",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
    "Cache-Control": "public, max-age=86400",
    "Content-Length": String(tamano),
  });
}

function rangoInvalido(tamano: number): Response {
  return new Response(null, {
    status: 416,
    headers: {
      "Content-Range": `bytes */${tamano}`,
      "Accept-Ranges": "bytes",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

async function leerTrozo(ruta: string, inicio: number, longitud: number): Promise<ArrayBuffer> {
  const archivo = await open(ruta, "r");
  try {
    const buffer = Buffer.alloc(longitud);
    await archivo.read(buffer, 0, longitud, inicio);
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  } finally {
    await archivo.close();
  }
}

export async function responderPmtiles(request: Request, ...partes: string[]): Promise<Response> {
  const ruta = rutaDatos(...partes);
  const info = await stat(ruta);
  const tamano = info.size;
  const metodo = request.method.toUpperCase();
  if (metodo === "HEAD") {
    return new Response(null, { headers: cabecerasComunes(tamano) });
  }

  const crudo = request.headers.get("range");
  if (!crudo) {
    const cuerpo = await leerTrozo(ruta, 0, tamano);
    return new Response(cuerpo, { headers: cabecerasComunes(tamano) });
  }

  const coincidencia = /^bytes=(\d*)-(\d*)$/.exec(crudo.trim());
  if (!coincidencia) return rangoInvalido(tamano);
  const inicioTxt = coincidencia[1] ?? "";
  const finTxt = coincidencia[2] ?? "";
  let inicio: number;
  let fin: number;
  if (inicioTxt === "") {
    const sufijo = Number(finTxt);
    if (!Number.isFinite(sufijo) || sufijo <= 0) return rangoInvalido(tamano);
    inicio = Math.max(0, tamano - sufijo);
    fin = tamano - 1;
  } else {
    inicio = Number(inicioTxt);
    fin = finTxt === "" ? tamano - 1 : Number(finTxt);
  }
  if (!Number.isFinite(inicio) || !Number.isFinite(fin) || inicio < 0 || inicio >= tamano || fin < inicio) {
    return rangoInvalido(tamano);
  }
  fin = Math.min(fin, tamano - 1);
  const longitud = fin - inicio + 1;
  const cuerpo = await leerTrozo(ruta, inicio, longitud);
  const headers = cabecerasComunes(longitud);
  headers.set("Content-Range", `bytes ${inicio}-${fin}/${tamano}`);
  return new Response(cuerpo, { status: 206, headers });
}

export function opcionesPmtiles(): Response {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Range, If-None-Match",
      "Access-Control-Max-Age": "86400",
    },
  });
}
