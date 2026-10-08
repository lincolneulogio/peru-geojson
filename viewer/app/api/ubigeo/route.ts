import { NextResponse } from "next/server";
import { leerConsulta } from "@/lib/domain/consulta";
import { consultarUbigeo, DatosError } from "@/lib/server/datos";

export const runtime = "nodejs";

function cabeceras(): HeadersInit {
  return {
    "Cache-Control": "public, max-age=3600",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };
}

export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204, headers: cabeceras() });
}

export async function GET(request: Request): Promise<NextResponse> {
  const leida = leerConsulta(new URL(request.url).searchParams);
  if (!leida.ok) {
    return NextResponse.json({ error: leida.error }, { status: 400, headers: cabeceras() });
  }
  try {
    const cuerpo = await consultarUbigeo(leida.consulta);
    if (leida.consulta.geometria && cuerpo.geometria) {
      const { geometria, ...resto } = cuerpo;
      return NextResponse.json(
        {
          ...resto,
          resultados: resto.resultados.map((registro, indice) =>
            indice === 0 ? { ...registro, geometria: geometria.geometry } : registro,
          ),
        },
        { headers: cabeceras() },
      );
    }
    return NextResponse.json(cuerpo, { headers: cabeceras() });
  } catch (error) {
    if (error instanceof DatosError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: cabeceras() });
    }
    return NextResponse.json({ error: "No se pudo consultar el ubigeo." }, { status: 500, headers: cabeceras() });
  }
}
