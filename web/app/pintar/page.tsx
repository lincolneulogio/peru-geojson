import type { Metadata } from "next";
import { PlaygroundCsv } from "@/components/playground-csv";
import { URL_PMTILES_CDN, URL_PMTILES_LOCAL } from "@/lib/cdn";
import { edicionActual, leerManifiesto, leerVersiones } from "@/lib/datos/versiones";

const descripcion =
  "Sube un CSV de ubigeos y pinta departamentos, provincias o distritos del Perú sobre teselas PMTiles. Límites IDE-INEI, licencia CC BY 4.0.";

export const metadata: Metadata = {
  title: "Pinta tu mapa por CSV",
  description: descripcion,
  alternates: { canonical: "/pintar" },
  openGraph: { title: "Pinta tu mapa por CSV", description: descripcion, url: "/pintar" },
};

export default function PintarPage() {
  const catalogo = leerVersiones();
  const edicion = edicionActual(catalogo);
  const manifiesto = leerManifiesto(edicion.id);
  const huella = manifiesto?.artefactos.find((item) => item.id === "pmtiles")?.sha256 ?? "";
  return <PlaygroundCsv anio={edicion.id} urlLocal={URL_PMTILES_LOCAL} urlCdn={URL_PMTILES_CDN} huella={huella} />;
}
