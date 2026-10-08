"use client";

import { useEffect, useMemo, useState } from "react";
import { BusquedaUbigeo } from "@/components/busqueda-ubigeo";
import { Cabecera } from "@/components/cabecera";
import { ConmutadorProveedor } from "@/components/conmutador-proveedor";
import { FichaUbigeo } from "@/components/ficha-ubigeo";
import { MapaPeru } from "@/components/mapa/mapa-peru";
import { SelectorUbigeo } from "@/components/selector-ubigeo";
import { useCatalogo } from "@/hooks/use-catalogo";
import { useTema } from "@/hooks/use-tema";
import type { ConteosVersion } from "@/lib/datos/versiones";
import type { ProveedorMapa } from "@/lib/mapa/tipos";
import type { UbigeoResource } from "@/lib/recursos/ubigeo";

interface VisorProps {
  anio: string;
  conteos: ConteosVersion;
}

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

export function Visor({ anio, conteos }: VisorProps) {
  const [oscuro, setOscuro] = useTema();
  const [proveedor, setProveedor] = useState<ProveedorMapa>("maplibre");
  const [dep, setDep] = useState("");
  const [prov, setProv] = useState("");
  const [dist, setDist] = useState("");
  const catalogo = useCatalogo(dep, prov);

  useEffect(() => {
    const guardado = localStorage.getItem("mapa-proveedor");
    if (guardado === "leaflet" || guardado === "maplibre") setProveedor(guardado);
  }, []);

  function cambiarProveedor(valor: ProveedorMapa) {
    localStorage.setItem("mapa-proveedor", valor);
    setProveedor(valor);
  }

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
      <Cabecera anio={anio} oscuro={oscuro} onTema={setOscuro}>
        <ConmutadorProveedor valor={proveedor} onChange={cambiarProveedor} />
      </Cabecera>
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
            {conteos.departamentos} departamentos, {conteos.provincias} provincias y {conteos.distritos} distritos.
            Edición cartográfica {anio}. El motor del mapa se puede cambiar entre MapLibre y Leaflet; los dos leen la
            misma API.
          </p>
        </aside>
        <div className="relative min-h-[55dvh] flex-1">
          <MapaPeru
            proveedor={proveedor}
            url={capaVisible(dep, prov)}
            seleccionado={seleccionado}
            oscuro={oscuro}
            onSelect={elegirUbigeo}
          />
        </div>
      </div>
    </div>
  );
}
