"use client";

import { useEffect, useRef, useState } from "react";
import type { JSX } from "react";
import { presentarNombre } from "@/lib/domain/consulta";
import type { Nivel } from "@/lib/types";

interface MapViewProps {
  nivel: Nivel;
  dark: boolean;
  dep: string | null;
  prov: string | null;
  q: string;
}

const URL_POR_NIVEL: Record<Nivel, string> = {
  departamental: "departamental",
  provincial: "provincial",
  distrital: "distrital",
  capitales: "capitales",
};

function tituloDe(propiedades: Record<string, string>): string {
  const crudo =
    propiedades["nombre_distrito"] ||
    propiedades["nombre_provincia"] ||
    propiedades["nombre_departamento"] ||
    propiedades["capital"] ||
    propiedades["distrito"] ||
    propiedades["departamento"] ||
    "—";
  return presentarNombre(crudo);
}

export function MapView({ nivel, dark, dep, prov, q }: MapViewProps): JSX.Element {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").GeoJSON | null>(null);
  const tilesRef = useRef<import("leaflet").TileLayer | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let cancelado = false;
    async function iniciar(): Promise<void> {
      const L = (await import("leaflet")).default;
      if (!divRef.current || cancelado || mapRef.current) return;
      mapRef.current = L.map(divRef.current, { scrollWheelZoom: true }).setView([-9.19, -75.0], 5);
      setListo(true);
    }
    void iniciar();
    return () => {
      cancelado = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelado = false;
    async function mosaico(): Promise<void> {
      const L = (await import("leaflet")).default;
      const mapa = mapRef.current;
      if (!mapa || cancelado) return;
      const url = dark
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
      if (tilesRef.current) tilesRef.current.remove();
      tilesRef.current = L.tileLayer(url, {
        attribution: '&copy; OpenStreetMap &copy; CARTO · Límites INEI (CC BY 4.0)',
        maxZoom: 12,
      }).addTo(mapa);
    }
    if (listo) void mosaico();
    return () => {
      cancelado = true;
    };
  }, [dark, listo]);

  useEffect(() => {
    let cancelado = false;
    async function cargar(): Promise<void> {
      const L = (await import("leaflet")).default;
      const mapa = mapRef.current;
      if (!mapa || !listo) return;
      const params = new URLSearchParams({ nivel: URL_POR_NIVEL[nivel] });
      if (dep) params.set("dep", dep);
      if (prov && nivel === "distrital") params.set("prov", prov);
      if (q.trim()) params.set("q", q.trim());
      const respuesta = await fetch(`/api/geo?${params.toString()}`);
      const coleccion = (await respuesta.json()) as GeoJSON.FeatureCollection;
      if (cancelado) return;
      if (layerRef.current) layerRef.current.remove();
      layerRef.current = L.geoJSON(coleccion as never, {
        style: { color: "#0f766e", weight: 1.1, fillColor: "#14b8a6", fillOpacity: dark ? 0.28 : 0.35 },
        pointToLayer: (_feature, latlng) => L.circleMarker(latlng, { radius: 5, color: "#c2410c", weight: 2 }),
        onEachFeature: (feature, capa) => {
          const propiedades = (feature.properties ?? {}) as Record<string, string>;
          const ubigeo = propiedades["ubigeo"] ?? "";
          capa.bindPopup(`<strong>${tituloDe(propiedades)}</strong><br/>${ubigeo}`);
        },
      }).addTo(mapa);
      try {
        mapa.fitBounds(layerRef.current.getBounds(), { padding: [16, 16] });
      } catch {
        mapa.setView([-9.19, -75.0], 5);
      }
    }
    void cargar();
    return () => {
      cancelado = true;
    };
  }, [nivel, dep, prov, q, listo, dark]);

  return (
    <div
      id="mapa"
      ref={divRef}
      className="h-[min(62dvh,720px)] min-h-[320px] w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800"
      aria-label="Mapa del Perú"
    />
  );
}
