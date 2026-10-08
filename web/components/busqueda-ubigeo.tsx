"use client";

import { useEffect, useState } from "react";
import type { ColeccionRecurso, UbigeoResource } from "@/lib/recursos/ubigeo";

interface BusquedaUbigeoProps {
  onElegir: (ubigeo: string) => void;
}

export function BusquedaUbigeo({ onElegir }: BusquedaUbigeoProps) {
  const [consulta, setConsulta] = useState("");
  const [resultados, setResultados] = useState<UbigeoResource[]>([]);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const texto = consulta.trim();
    if (texto.length < 2) {
      setResultados([]);
      setMensaje("");
      return;
    }
    const controlador = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/ubigeo?q=${encodeURIComponent(texto)}`, { signal: controlador.signal })
        .then(async (respuesta) => {
          if (!respuesta.ok) {
            const cuerpo = (await respuesta.json()) as { error?: { message?: string } };
            throw new Error(cuerpo.error?.message ?? "Búsqueda no disponible.");
          }
          return respuesta.json() as Promise<ColeccionRecurso<UbigeoResource>>;
        })
        .then((coleccion) => {
          setResultados(coleccion.data);
          setMensaje(coleccion.data.length === 0 ? "Sin coincidencias." : "");
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setMensaje(error instanceof Error ? error.message : "No se pudo buscar.");
        });
    }, 250);
    return () => {
      controlador.abort();
      window.clearTimeout(timer);
    };
  }, [consulta]);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="buscar-ubigeo" className="text-xs font-semibold tracking-wide text-stone-500 uppercase dark:text-stone-400">
        Buscar por ubigeo o nombre
      </label>
      <input
        id="buscar-ubigeo"
        value={consulta}
        onChange={(event) => setConsulta(event.target.value)}
        placeholder="1501 o miraflores"
        className="rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 dark:border-stone-700 dark:bg-stone-950 dark:focus:border-teal-400"
        autoComplete="off"
      />
      {mensaje ? <p className="text-sm text-stone-500 dark:text-stone-400">{mensaje}</p> : null}
      {resultados.length > 0 ? (
        <ul className="max-h-48 overflow-auto rounded-xl border border-stone-200 dark:border-stone-800">
          {resultados.map((item) => (
            <li key={`${item.nivel}-${item.ubigeo}`}>
              <button
                type="button"
                onClick={() => onElegir(item.ubigeo)}
                className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-teal-50 dark:hover:bg-stone-800"
              >
                <span>{item.nombre}</span>
                <span className="font-mono text-xs text-stone-500">{item.ubigeo}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
