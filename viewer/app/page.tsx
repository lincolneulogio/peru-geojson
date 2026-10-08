import type { JSX } from "react";
import { GeoExplorer } from "@/components/GeoExplorer";
import { StatsCards } from "@/components/StatsCards";
import { presentarNombre } from "@/lib/domain/consulta";
import { urlDelSitio } from "@/lib/sitio";
import { cargarConteos, cargarIndice } from "@/lib/server/datos";
import { ATRIBUCION, LICENCIA_DATOS_URL } from "../../types/licencia";

export default async function Page(): Promise<JSX.Element> {
  const [conteos, indice] = await Promise.all([cargarConteos(), cargarIndice()]);
  const depOptions = indice.departamentos.map((registro) => ({
    value: registro.ubigeo,
    label: `${registro.ubigeo} — ${presentarNombre(registro.nombre_departamento)}`,
  }));
  const provOptions = indice.provincias.map((registro) => ({
    value: registro.ubigeo,
    label: `${registro.ubigeo} — ${presentarNombre(registro.nombre_provincia)}`,
    dep: registro.ubigeo.slice(0, 2),
  }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Límites administrativos del Perú",
    description:
      "Departamentos, provincias y distritos del Perú en GeoJSON, TopoJSON y PMTiles, con API de ubigeo.",
    url: urlDelSitio(),
    license: LICENCIA_DATOS_URL,
    creator: { "@type": "Organization", name: "Instituto Nacional de Estadística e Informática" },
    keywords: ["Perú", "ubigeo", "GeoJSON", "INEI"],
    spatialCoverage: "Perú",
    isAccessibleForFree: true,
  };

  return (
    <div className="space-y-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {ATRIBUCION} El visor usa la variante light. La API pública es{" "}
        <code className="rounded bg-slate-200 px-1 py-0.5 text-xs dark:bg-slate-800">/api/ubigeo</code>.
      </p>
      <StatsCards
        stats={{
          departamental: { ok: conteos.departamentos },
          provincial: { ok: conteos.provincias },
          distrital: { ok: conteos.distritos },
          capitales: { ok: conteos.capitales },
        }}
      />
      <GeoExplorer
        depOptions={depOptions}
        provOptions={provOptions}
        counts={{
          departamental: conteos.departamentos,
          provincial: conteos.provincias,
          distrital: conteos.distritos,
          capitales: conteos.capitales,
        }}
      />
    </div>
  );
}
