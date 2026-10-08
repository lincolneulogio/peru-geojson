"use client";

import { useEffect, useMemo, useState } from "react";
import { BusquedaUbigeo } from "@/components/busqueda-ubigeo";
import { FichaUbigeo } from "@/components/ficha-ubigeo";
import { MapaPeru } from "@/components/mapa-peru";
import { SelectorUbigeo } from "@/components/selector-ubigeo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useCatalogo } from "@/hooks/use-catalogo";
import type { UbigeoResource } from "@/lib/recursos/ubigeo";

function capaVisible(dep: string, prov: string): string {
  if (prov) return `/api/geo/distritos?prov=${prov}`;
  if (dep) return `/api/geo/provincias?dep=${dep}`;
  return "/api/geo/departamentos";
}

function enlaceDescarga(dep: string, prov: string): string {
  if (prov) return `/api/descarga?nivel=distrital&ubigeo=${prov}`;
  if (dep) return `/api/descarga?nivel=provincial&ubigeo=${dep}`;
  return "/api/descarga?nivel=departamental";
}

function aOpciones(registros: UbigeoResource[]) {
  return registros.map((item) => ({ ubigeo: item.ubigeo, nombre: item.nombre }));
}

export function Visor() {
  const [oscuro, setOscuro] = useState(false);
  const [dep, setDep] = useState("");
  const [prov, setProv] = useState("");
  const [dist, setDist] = useState("");
  const catalogo = useCatalogo(dep, prov);

  useEffect(() => {
    setOscuro(document.documentElement.classList.contains("dark"));
  }, []);

  const seleccionado = dist || prov || dep;
  const registro = useMemo(() => {
    const listas = [catalogo.distritos, catalogo.provincias, catalogo.departamentos];
    for (const lista of listas) {
      const hallado = lista.find((item) => item.ubigeo === seleccionado);
      if (hallado) return hallado;
    }
    return null;
  }, [catalogo.departamentos, catalogo.distritos, catalogo.provincias, seleccionado]);

  function elegirUbigeo(ubigeo: string) {
    setDep(ubigeo.slice(0, 2));
    setProv(ubigeo.length >= 4 ? ubigeo.slice(0, 4) : "");
    setDist(ubigeo.length === 6 ? ubigeo : "");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-4 py-3 md:px-6 dark:border-stone-800">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-teal-800 uppercase dark:text-teal-300">
            IDE-INEI · EPSG:4326
          </p>
          <h1 className="text-lg font-semibold tracking-tight md:text-xl">Perú GeoJSON</h1>
        </div>
        <ThemeToggle oscuro={oscuro} onChange={setOscuro} />
      </header>
      <div className="flex flex-1 flex-col md:flex-row">
        <aside className="flex w-full flex-col gap-4 border-stone-200 p-4 md:w-[23rem] md:border-r md:p-5 dark:border-stone-800">
          <SelectorUbigeo
            id="dep"
            etiqueta="Departamento"
            valor={dep}
            placeholder="Los 25 departamentos"
            opciones={aOpciones(catalogo.departamentos)}
            onChange={(valor) => {
              setDep(valor);
              setProv("");
              setDist("");
            }}
          />
          <SelectorUbigeo
            id="prov"
            etiqueta="Provincia"
            valor={prov}
            placeholder={dep ? "Elige una provincia" : "Primero el departamento"}
            opciones={aOpciones(catalogo.provincias)}
            deshabilitado={!dep}
            onChange={(valor) => {
              setProv(valor);
              setDist("");
            }}
          />
          <SelectorUbigeo
            id="dist"
            etiqueta="Distrito"
            valor={dist}
            placeholder={prov ? "Elige un distrito" : "Primero la provincia"}
            opciones={aOpciones(catalogo.distritos)}
            deshabilitado={!prov}
            onChange={setDist}
          />
          <BusquedaUbigeo onElegir={elegirUbigeo} />
          {catalogo.cargando ? <p className="text-sm text-stone-500">Cargando catálogo…</p> : null}
          {catalogo.error ? <p className="text-sm text-red-700 dark:text-red-300">{catalogo.error}</p> : null}
          <FichaUbigeo registro={registro} descarga={enlaceDescarga(dep, prov)} />
          <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            25 departamentos, 196 provincias y 1890 distritos. Geometría simplificada a 0.0005°
            para la web. Los archivos originales del repositorio no cambian.
          </p>
        </aside>
        <div className="relative min-h-[55dvh] flex-1">
          <MapaPeru url={capaVisible(dep, prov)} seleccionado={seleccionado} oscuro={oscuro} onSelect={elegirUbigeo} />
        </div>
      </div>
    </div>
  );
}
