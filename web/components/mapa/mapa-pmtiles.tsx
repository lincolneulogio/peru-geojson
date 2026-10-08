"use client";

import { useEffect, useRef } from "react";
import maplibregl, { type ExpressionSpecification, type Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { escaparHtml, tituloAmbito, ubigeoDe } from "@/lib/mapa/texto";
import { asegurarProtocoloPmtiles, urlProtocoloPmtiles } from "@/lib/pmtiles/protocolo";
import { colorVacio, type NivelTesela, type TablaPintura } from "@/lib/pintar/csv";

const ESTILOS = {
  claro: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  oscuro: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
};

const NIVELES: NivelTesela[] = ["departamentos", "provincias", "distritos"];

const ZOOM: Record<NivelTesela, number> = {
  departamentos: 4.2,
  provincias: 5.8,
  distritos: 7.6,
};

interface MapaPmtilesProps {
  url: string;
  oscuro: boolean;
  tabla: TablaPintura | null;
}

function relleno(tabla: TablaPintura | null, nivel: NivelTesela, vacio: string): ExpressionSpecification {
  const pares: string[] = [];
  if (tabla && tabla.nivel === nivel) {
    for (const fila of tabla.filas) pares.push(fila.ubigeo, fila.color);
  }
  if (pares.length === 0) {
    return (tabla ? vacio : "#0f766e") as unknown as ExpressionSpecification;
  }
  const expresion: Array<string | ["get", string]> = ["match", ["get", "ubigeo"], ...pares, vacio];
  return expresion as ExpressionSpecification;
}

export function MapaPmtiles({ url, oscuro, tabla }: MapaPmtilesProps) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<Map | null>(null);
  const tablaRef = useRef(tabla);
  const oscuroRef = useRef(oscuro);
  const nivelPrevio = useRef<NivelTesela | null>(null);
  tablaRef.current = tabla;
  oscuroRef.current = oscuro;

  function montarCapas(map: Map, origen: string) {
    if (map.getSource("peru")) return;
    map.addSource("peru", { type: "vector", url: origen });
    for (const nivel of NIVELES) {
      map.addLayer({
        id: `${nivel}-fill`,
        type: "fill",
        source: "peru",
        "source-layer": nivel,
        paint: { "fill-color": "#0f766e", "fill-opacity": 0.72 },
      });
      map.addLayer({
        id: `${nivel}-line`,
        type: "line",
        source: "peru",
        "source-layer": nivel,
        paint: { "line-color": "#134e4a", "line-width": nivel === "departamentos" ? 1.1 : 0.4 },
      });
    }
  }

  function pintar(map: Map) {
    if (!map.getSource("peru")) return;
    const actual = tablaRef.current;
    const vacio = colorVacio(oscuroRef.current);
    const activo = actual?.nivel ?? "departamentos";
    for (const nivel of NIVELES) {
      const visible = !actual || nivel === activo;
      if (map.getLayer(`${nivel}-fill`)) {
        map.setLayoutProperty(`${nivel}-fill`, "visibility", visible ? "visible" : "none");
        map.setPaintProperty(`${nivel}-fill`, "fill-color", relleno(actual, nivel, vacio));
        map.setPaintProperty(`${nivel}-fill`, "fill-opacity", actual ? 0.82 : 0.4);
      }
      if (map.getLayer(`${nivel}-line`)) {
        map.setLayoutProperty(`${nivel}-line`, "visibility", visible ? "visible" : "none");
      }
    }
  }

  useEffect(() => {
    if (!contenedor.current) return;
    asegurarProtocoloPmtiles();
    const origen = urlProtocoloPmtiles(url);
    const map = new maplibregl.Map({
      container: contenedor.current,
      style: oscuroRef.current ? ESTILOS.oscuro : ESTILOS.claro,
      bounds: [
        [-81.35, -18.4],
        [-68.65, -0.03],
      ],
      fitBoundsOptions: { padding: 28 },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => {
      montarCapas(map, origen);
      pintar(map);
      const actual = tablaRef.current;
      if (actual) map.jumpTo({ center: [-75, -9.2], zoom: ZOOM[actual.nivel] });
    });
    map.on("click", (event) => {
      const capas = NIVELES.filter((nivel) => map.getLayer(`${nivel}-fill`)).map((nivel) => `${nivel}-fill`);
      if (capas.length === 0) return;
      const hits = map.queryRenderedFeatures(event.point, { layers: capas });
      const props = hits[0]?.properties as Record<string, unknown> | undefined;
      const ubigeo = ubigeoDe(props);
      if (!ubigeo) return;
      const fila = tablaRef.current?.filas.find((item) => item.ubigeo === ubigeo);
      const nombre = fila?.etiqueta || tituloAmbito(props ?? {});
      const valor = fila?.valor !== null && fila?.valor !== undefined ? `<br/>${escaparHtml(String(fila.valor))}` : "";
      new maplibregl.Popup({ closeButton: false, offset: 12 })
        .setLngLat(event.lngLat)
        .setHTML(`<strong>${escaparHtml(nombre)}</strong><br/><span>${escaparHtml(ubigeo)}</span>${valor}`)
        .addTo(map);
    });
    map.on("mousemove", (event) => {
      const capas = NIVELES.filter((nivel) => map.getLayer(`${nivel}-fill`)).map((nivel) => `${nivel}-fill`);
      if (capas.length === 0) return;
      const hits = map.queryRenderedFeatures(event.point, { layers: capas });
      map.getCanvas().style.cursor = hits.length > 0 ? "pointer" : "";
    });
    mapa.current = map;
    return () => {
      map.remove();
      mapa.current = null;
    };
  }, [url]);

  const temaInicial = useRef(true);
  useEffect(() => {
    const map = mapa.current;
    if (!map) return;
    if (temaInicial.current) {
      temaInicial.current = false;
      return;
    }
    const origen = urlProtocoloPmtiles(url);
    map.setStyle(oscuro ? ESTILOS.oscuro : ESTILOS.claro);
    map.once("style.load", () => {
      montarCapas(map, origen);
      pintar(map);
    });
  }, [oscuro]);

  useEffect(() => {
    const map = mapa.current;
    if (!map?.isStyleLoaded() || !map.getSource("peru")) return;
    pintar(map);
    const nivel = tabla?.nivel ?? null;
    if (!tabla || nivel === nivelPrevio.current) return;
    nivelPrevio.current = nivel;
    map.easeTo({ center: [-75, -9.2], zoom: ZOOM[tabla.nivel], duration: 650 });
  }, [tabla]);

  return <div ref={contenedor} className="h-full min-h-[55dvh] w-full" role="application" aria-label="Mapa pintado por ubigeo" />;
}
