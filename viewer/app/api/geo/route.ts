import { NextResponse } from "next/server";
import { normalizarNivel } from "@/lib/domain/consulta";
import { coleccionParaMapa } from "@/lib/server/datos";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const params = new URL(request.url).searchParams;
  const nivel = normalizarNivel(params.get("nivel") ?? "departamental");
  if (!nivel || nivel === "invalido") {
    return NextResponse.json({ error: "nivel inválido" }, { status: 400 });
  }
  const dep = params.get("dep")?.trim() ?? "";
  const prov = params.get("prov")?.trim() ?? "";
  const q = params.get("q")?.trim() ?? "";
  if (dep && !/^\d{2}$/.test(dep)) {
    return NextResponse.json({ error: "dep inválido" }, { status: 400 });
  }
  if (prov && !/^\d{4}$/.test(prov)) {
    return NextResponse.json({ error: "prov inválido" }, { status: 400 });
  }
  const coleccion = await coleccionParaMapa({
    nivel,
    dep: dep || undefined,
    prov: prov || undefined,
    q: q || undefined,
  });
  return NextResponse.json(coleccion, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
