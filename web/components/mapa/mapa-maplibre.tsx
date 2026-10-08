"use client";

import { useEffect, useRef } from "react";
import maplibregl, { type GeoJSONSource, type Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { ColeccionUbigeo } from "peru-geojson/contrato";
import { escaparHtml, tituloAmbito, ubigeoDe } from "@/lib/mapa/texto";
import type { PropsMapa } from "@/lib/mapa/tipos";

const ESTILOS = {
  claro: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  oscuro: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
};

const VACIO: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

function comoGeoJson(coleccion: ColeccionUbigeo): GeoJSON.FeatureCollection {
  return coleccion as unknown as GeoJSON.FeatureCollection;
}

export function MapaMaplibre({ url, seleccionado, oscuro, onSelect }: PropsMapa) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<Map | null>(null);
  const datos = useRef<ColeccionUbigeo | null>(null);
  const seleccionadoRef = useRef(seleccionado);
  const onSelectRef = useRef(onSelect);
  seleccionadoRef.current = seleccionado;
  onSelectRef.current = onSelect;

  function montarCapas(map: Map) {
    if (map.getSource("peru")) return;
    map.addSource("peru", {
      type: "geojson",
      data: VACIO,
    });
    map.addLayer({
      id: "peru-fill",
      type: "fill",
      source: "peru",
      paint: { "fill-color": "#0f766e", "fill-opacity": 0.38 },
    });
    map.addLayer({
      id: "peru-line",
      type: "line",
      source: "peru",
      paint: { "line-color": "#134e4a", "line-width": 0.8 },
    });
  }

  function pintar(map: Map) {
    if (!map.getSource("peru") || !datos.current) return;
    (map.getSource("peru") as GeoJSONSource).setData(comoGeoJson(datos.current));
    const elegido = seleccionadoRef.current;
    map.setPaintProperty("peru-fill", "fill-color", ["case", ["==", ["get", "ubigeo"], elegido], "#d97706", "#0f766e"]);
    map.setPaintProperty("peru-fill", "fill-opacity", ["case", ["==", ["get", "ubigeo"], elegido], 0.62, 0.38]);
    map.setPaintProperty("peru-line", "line-color", ["case", ["==", ["get", "ubigeo"], elegido], "#f59e0b", "#134e4a"]);
    map.setPaintProperty("peru-line", "line-width", ["case", ["==", ["get", "ubigeo"], elegido], 2.2, 0.8]);
  }

  useEffect(() => {
    if (!contenedor.current) return;
    const map = new maplibregl.Map({
      container: contenedor.current,
      style: oscuro ? ESTILOS.oscuro : ESTILOS.claro,
      bounds: [
        [-81.35, -18.4],
        [-68.65, -0.03],
      ],
      fitBoundsOptions: { padding: 28 },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => {
      montarCapas(map);
      pintar(map);
    });
    map.on("click", (event) => {
      if (!map.getLayer("peru-fill")) return;
      const hits = map.queryRenderedFeatures(event.point, { layers: ["peru-fill"] });
      const props = hits[0]?.properties as Record<string, unknown> | undefined;
      const ubigeo = ubigeoDe(props);
      if (!ubigeo) return;
      onSelectRef.current(ubigeo);
      const nombre = tituloAmbito(props ?? {});
      new maplibregl.Popup({ closeButton: false, offset: 12 })
        .setLngLat(event.lngLat)
        .setHTML(`<strong>${escaparHtml(nombre)}</strong><br/><span>${escaparHtml(ubigeo)}</span>`)
        .addTo(map);
    });
    map.on("mousemove", (event) => {
      if (!map.getLayer("peru-fill")) return;
      const hits = map.queryRenderedFeatures(event.point, { layers: ["peru-fill"] });
      map.getCanvas().style.cursor = hits.length > 0 ? "pointer" : "";
    });
    mapa.current = map;
    return () => {
      map.remove();
      mapa.current = null;
    };
    // El mapa se instancia una sola vez; el tema se aplica en el efecto siguiente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const temaInicial = useRef(true);
  useEffect(() => {
    const map = mapa.current;
    if (!map) return;
    if (temaInicial.current) {
      temaInicial.current = false;
      return;
    }
    map.setStyle(oscuro ? ESTILOS.oscuro : ESTILOS.claro);
    map.once("style.load", () => {
      montarCapas(map);
      pintar(map);
    });
  }, [oscuro]);

  useEffect(() => {
    const map = mapa.current;
    if (map?.getLayer("peru-fill")) pintar(map);
  }, [seleccionado]);

  useEffect(() => {
    const controlador = new AbortController();
    fetch(url, { signal: controlador.signal })
      .then(async (respuesta) => {
        if (!respuesta.ok) throw new Error("No se pudo cargar la geometría.");
        return respuesta.json() as Promise<ColeccionUbigeo>;
      })
      .then((coleccion) => {
        datos.current = coleccion;
        const map = mapa.current;
        if (!map?.isStyleLoaded()) return;
        if (!map.getSource("peru")) montarCapas(map);
        pintar(map);
        map.fitBounds(
          [
            [coleccion.bbox[0], coleccion.bbox[1]],
            [coleccion.bbox[2], coleccion.bbox[3]],
          ],
          { padding: 36, duration: 700, maxZoom: 11 },
        );
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
      });
    return () => controlador.abort();
  }, [url]);

  return <div ref={contenedor} className="h-full min-h-[55dvh] w-full" role="application" aria-label="Mapa del Perú" />;
}
