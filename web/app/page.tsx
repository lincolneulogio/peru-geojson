import { Visor } from "@/components/visor";
import { edicionActual, leerVersiones } from "@/lib/datos/versiones";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Límites administrativos del Perú",
  description:
    "Departamentos, provincias y distritos del Perú en GeoJSON, TopoJSON y PMTiles, con visor y API de ubigeo.",
  license: "https://creativecommons.org/licenses/by/4.0/",
  creator: {
    "@type": "Organization",
    name: "Instituto Nacional de Estadística e Informática",
  },
  spatialCoverage: "Perú",
  isAccessibleForFree: true,
  keywords: ["Perú", "ubigeo", "GeoJSON", "INEI"],
};

export default function Page() {
  const edicion = edicionActual(leerVersiones());
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Visor anio={edicion.id} conteos={edicion.conteos} />
    </>
  );
}
