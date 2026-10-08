"use client";

import { useEffect, useRef, useState } from "react";
import type { GeoJSON as CapaGeoJson, Layer, Map as InstanciaLeaflet, PathOptions, TileLayer } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ColeccionUbigeo } from "peru-geojson/contrato";
import { escaparHtml, tituloAmbito, ubigeoDe } from "@/lib/mapa/texto";
import type { PropsMapa } from "@/lib/mapa/tipos";

interface CapaTrazada extends Layer {
  feature?: GeoJSON.Feature;
  setStyle: (estilo: PathOptions) => void;
}

function esTrazada(capa: Layer): capa is CapaTrazada {
  return "setStyle" in capa && typeof capa.setStyle === "function";
}

function estilo(ubigeo: string, seleccionado: string, oscuro: boolean): PathOptions {
  const activo = ubigeo !== "" && ubigeo === seleccionado;
  return {
    color: activo ? "#f59e0b" : "#134e4a",
    weight: activo ? 2.2 : 0.8,
    fillColor: activo ? "#d97706" : "#0f766e",
    fillOpacity: activo ? 0.62 : oscuro ? 0.32 : 0.38,
  };
}

export function MapaLeaflet({ url, seleccionado, oscuro, onSelect }: PropsMapa) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<InstanciaLeaflet | null>(null);
  const capa = useRef<CapaGeoJson | null>(null);
  const mosaico = useRef<TileLayer | null>(null);
  const seleccionadoRef = useRef(seleccionado);
  const oscuroRef = useRef(oscuro);
  const onSelectRef = useRef(onSelect);
  seleccionadoRef.current = seleccionado;
  oscuroRef.current = oscuro;
  onSelectRef.current = onSelect;
  const [listo, setListo] = useState(false);

  function repintar() {
    const grupo = capa.current;
    if (!grupo) return;
    grupo.eachLayer((item) => {
      if (!esTrazada(item)) return;
      const props = (item.feature?.properties ?? {}) as Record<string, unknown>;
      item.setStyle(estilo(ubigeoDe(props), seleccionadoRef.current, oscuroRef.current));
    });
  }

  useEffect(() => {
    let cancelado = false;
    async function iniciar() {
      const L = (await import("leaflet")).default;
      if (!contenedor.current || cancelado || mapa.current) return;
      const map = L.map(contenedor.current, { scrollWheelZoom: true }).fitBounds([
        [-18.4, -81.35],
        [-0.03, -68.65],
      ]);
      mapa.current = map;
      window.setTimeout(() => map.invalidateSize(), 0);
      setListo(true);
    }
    void iniciar();
    return () => {
      cancelado = true;
      mapa.current?.remove();
      mapa.current = null;
      capa.current = null;
      mosaico.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelado = false;
    async function cambiarMosaico() {
      const L = (await import("leaflet")).default;
      const map = mapa.current;
      if (!map || cancelado) return;
      const plantilla = oscuro
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
      if (mosaico.current) mosaico.current.remove();
      mosaico.current = L.tileLayer(plantilla, {
        attribution: "&copy; OpenStreetMap &copy; CARTO · Límites INEI (CC BY 4.0)",
        maxZoom: 12,
      }).addTo(map);
      repintar();
    }
    if (listo) void cambiarMosaico();
    return () => {
      cancelado = true;
    };
  }, [oscuro, listo]);

  useEffect(() => {
    repintar();
  }, [seleccionado]);

  useEffect(() => {
    const controlador = new AbortController();
    async function cargar() {
      const L = (await import("leaflet")).default;
      const map = mapa.current;
      if (!map || !listo) return;
      const respuesta = await fetch(url, { signal: controlador.signal });
      if (!respuesta.ok) return;
      const coleccion = (await respuesta.json()) as ColeccionUbigeo;
      if (controlador.signal.aborted) return;
      if (capa.current) capa.current.remove();
      const grupo = L.geoJSON(coleccion as unknown as GeoJSON.GeoJsonObject, {
        style: (feature) => {
          const props = (feature?.properties ?? {}) as Record<string, unknown>;
          return estilo(ubigeoDe(props), seleccionadoRef.current, oscuroRef.current);
        },
        onEachFeature: (feature, item) => {
          const props = (feature.properties ?? {}) as Record<string, unknown>;
          const ubigeo = ubigeoDe(props);
          const nombre = tituloAmbito(props);
          item.bindPopup(`<strong>${escaparHtml(nombre)}</strong><br/>${escaparHtml(ubigeo)}`);
          item.on("click", () => {
            if (ubigeo) onSelectRef.current(ubigeo);
          });
        },
      });
      grupo.addTo(map);
      capa.current = grupo;
      try {
        map.fitBounds(grupo.getBounds(), { padding: [24, 24], maxZoom: 11 });
      } catch {
        map.fitBounds([
          [-18.4, -81.35],
          [-0.03, -68.65],
        ]);
      }
    }
    if (listo) {
      void cargar().catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
      });
    }
    return () => controlador.abort();
  }, [url, listo]);

  return <div ref={contenedor} className="h-full min-h-[55dvh] w-full" role="application" aria-label="Mapa del Perú" />;
}
