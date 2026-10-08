"use client";

import dynamic from "next/dynamic";
import type { PropsMapa, ProveedorMapa } from "@/lib/mapa/tipos";

const MapaMaplibre = dynamic(() => import("@/components/mapa/mapa-maplibre").then((mod) => mod.MapaMaplibre), {
  ssr: false,
  loading: () => <div className="h-full min-h-[55dvh] w-full animate-pulse bg-stone-200 dark:bg-stone-900" />,
});

const MapaLeaflet = dynamic(() => import("@/components/mapa/mapa-leaflet").then((mod) => mod.MapaLeaflet), {
  ssr: false,
  loading: () => <div className="h-full min-h-[55dvh] w-full animate-pulse bg-stone-200 dark:bg-stone-900" />,
});

interface MapaPeruProps extends PropsMapa {
  proveedor: ProveedorMapa;
}

export function MapaPeru({ proveedor, ...props }: MapaPeruProps) {
  if (proveedor === "leaflet") return <MapaLeaflet {...props} />;
  return <MapaMaplibre {...props} />;
}
