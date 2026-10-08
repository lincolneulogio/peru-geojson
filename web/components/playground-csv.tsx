"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Cabecera } from "@/components/cabecera";
import { useTema } from "@/hooks/use-tema";
import { CSV_EJEMPLO, colorEscalaPublica, interpretarCsv } from "@/lib/pintar/csv";

const MapaPmtiles = dynamic(() => import("@/components/mapa/mapa-pmtiles").then((mod) => mod.MapaPmtiles), {
  ssr: false,
  loading: () => <div className="h-full min-h-[55dvh] w-full animate-pulse bg-stone-200 dark:bg-stone-900" />,
});

interface PlaygroundCsvProps {
  anio: string;
  urlLocal: string;
  urlCdn: string;
  huella: string;
}

export function PlaygroundCsv({ anio, urlLocal, urlCdn, huella }: PlaygroundCsvProps) {
  const [oscuro, setOscuro] = useTema();
  const [texto, setTexto] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [fuente, setFuente] = useState<"local" | "cdn">("local");
  const lectura = useMemo(() => interpretarCsv(texto), [texto]);
  const tabla = lectura.tabla;

  async function copiarCdn() {
    await navigator.clipboard.writeText(urlCdn);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 1600);
  }

  function cargarArchivo(archivo: File | undefined) {
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = () => {
      if (typeof lector.result === "string") setTexto(lector.result);
    };
    lector.readAsText(archivo, "utf-8");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Cabecera anio={anio} oscuro={oscuro} onTema={setOscuro} />
      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="flex w-full flex-col gap-4 border-stone-200 p-4 lg:w-[26rem] lg:border-r lg:p-5 dark:border-stone-800">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Pinta el mapa con un CSV de ubigeos</h2>
            <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
              Una columna <span className="font-mono">ubigeo</span> (2, 4 o 6 dígitos) y, si quieres una escala,{" "}
              <span className="font-mono">valor</span>. El mapa usa las teselas PMTiles de la edición {anio}.
            </p>
          </div>
          <div
            className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-950"
            onDragOver={(evento) => evento.preventDefault()}
            onDrop={(evento) => {
              evento.preventDefault();
              cargarArchivo(evento.dataTransfer.files[0]);
            }}
          >
            <label htmlFor="csv" className="text-xs font-semibold tracking-wide text-stone-500 uppercase dark:text-stone-400">
              CSV
            </label>
            <textarea
              id="csv"
              value={texto}
              spellCheck={false}
              onChange={(evento) => setTexto(evento.target.value)}
              placeholder={"ubigeo,valor,etiqueta\n15,100,Lima\n150101,80,Cercado de Lima"}
              className="mt-2 h-40 w-full resize-y rounded-xl border border-stone-300 bg-white p-3 font-mono text-xs text-stone-800 outline-none focus:border-teal-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <label className="cursor-pointer rounded-full border border-stone-300 px-3 py-1.5 text-sm font-medium hover:border-teal-700 dark:border-stone-700">
                Subir archivo
                <input
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  className="sr-only"
                  onChange={(evento) => cargarArchivo(evento.target.files?.[0])}
                />
              </label>
              <button
                type="button"
                onClick={() => setTexto(CSV_EJEMPLO)}
                className="rounded-full bg-teal-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-700 dark:bg-teal-500 dark:text-stone-950"
              >
                Cargar ejemplo
              </button>
            </div>
          </div>
          {lectura.mensaje ? <p className="text-sm text-amber-800 dark:text-amber-200">{lectura.mensaje}</p> : null}
          {tabla ? (
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-stone-500">Nivel</dt>
                <dd className="font-medium">{tabla.nivel}</dd>
              </div>
              <div>
                <dt className="text-stone-500">Ubigeos</dt>
                <dd className="font-medium">{tabla.filas.length}</dd>
              </div>
              <div>
                <dt className="text-stone-500">Mínimo</dt>
                <dd className="font-medium">{tabla.min ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-stone-500">Máximo</dt>
                <dd className="font-medium">{tabla.max ?? "—"}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-stone-500">Pega un CSV o carga el ejemplo. Las cifras del ejemplo no son un censo.</p>
          )}
          {tabla?.tieneValores ? (
            <div>
              <div
                className="h-3 rounded-full"
                style={{ background: `linear-gradient(90deg, ${colorEscalaPublica(0)}, ${colorEscalaPublica(1)})` }}
              />
              <div className="mt-1 flex justify-between text-xs text-stone-500">
                <span>{tabla.min}</span>
                <span>{tabla.max}</span>
              </div>
            </div>
          ) : null}
          <div className="space-y-2 text-sm">
            <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">Teselas</p>
            <div className="flex gap-2">
              <button
                type="button"
                aria-pressed={fuente === "local"}
                onClick={() => setFuente("local")}
                className={
                  fuente === "local"
                    ? "rounded-full bg-stone-900 px-3 py-1 text-sm font-semibold text-white dark:bg-stone-100 dark:text-stone-950"
                    : "rounded-full border border-stone-300 px-3 py-1 dark:border-stone-700"
                }
              >
                Este sitio
              </button>
              <button
                type="button"
                aria-pressed={fuente === "cdn"}
                onClick={() => setFuente("cdn")}
                className={
                  fuente === "cdn"
                    ? "rounded-full bg-stone-900 px-3 py-1 text-sm font-semibold text-white dark:bg-stone-100 dark:text-stone-950"
                    : "rounded-full border border-stone-300 px-3 py-1 dark:border-stone-700"
                }
              >
                CDN
              </button>
            </div>
            <p className="break-all font-mono text-[11px] leading-relaxed text-stone-500">{fuente === "cdn" ? urlCdn : urlLocal}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copiarCdn()}
                className="rounded-full border border-stone-300 px-3 py-1.5 text-sm font-medium dark:border-stone-700"
              >
                {copiado ? "URL copiada" : "Copiar URL del CDN"}
              </button>
              <a
                href={urlLocal}
                download="peru-ubigeo.pmtiles"
                className="rounded-full border border-stone-300 px-3 py-1.5 text-sm font-medium dark:border-stone-700"
              >
                Descargar PMTiles
              </a>
            </div>
            <p className="text-xs leading-relaxed text-stone-500">
              sha256 del archivo publicado: <span className="font-mono">{huella.slice(0, 16)}…</span>
            </p>
          </div>
        </aside>
        <div className="relative min-h-[55dvh] flex-1">
          <MapaPmtiles url={fuente === "cdn" ? urlCdn : urlLocal} oscuro={oscuro} tabla={tabla} />
        </div>
      </div>
    </div>
  );
}
