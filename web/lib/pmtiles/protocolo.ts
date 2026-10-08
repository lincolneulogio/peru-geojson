import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";

const marca = globalThis as typeof globalThis & { __peruPmtiles?: boolean };

export function asegurarProtocoloPmtiles(): void {
  if (marca.__peruPmtiles) return;
  const protocolo = new Protocol();
  maplibregl.addProtocol("pmtiles", protocolo.tile);
  marca.__peruPmtiles = true;
}

export function urlProtocoloPmtiles(ruta: string): string {
  const absoluta = ruta.startsWith("http://") || ruta.startsWith("https://") ? ruta : new URL(ruta, window.location.origin).href;
  return `pmtiles://${absoluta}`;
}
