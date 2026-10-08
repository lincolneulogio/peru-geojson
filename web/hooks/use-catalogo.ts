"use client";

import { useEffect, useState } from "react";
import type { ColeccionRecurso, UbigeoResource } from "@/lib/recursos/ubigeo";

async function traer(url: string): Promise<UbigeoResource[]> {
  const respuesta = await fetch(url);
  if (!respuesta.ok) {
    const cuerpo = (await respuesta.json()) as { error?: { message?: string } };
    throw new Error(cuerpo.error?.message ?? "No se pudo cargar el catálogo.");
  }
  const json = (await respuesta.json()) as ColeccionRecurso<UbigeoResource>;
  return json.data;
}

interface Catalogo {
  departamentos: UbigeoResource[];
  provincias: UbigeoResource[];
  distritos: UbigeoResource[];
  cargando: boolean;
  error: string;
}

export function useCatalogo(dep: string, prov: string): Catalogo {
  const [departamentos, setDepartamentos] = useState<UbigeoResource[]>([]);
  const [provincias, setProvincias] = useState<UbigeoResource[]>([]);
  const [distritos, setDistritos] = useState<UbigeoResource[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controlador = new AbortController();
    traer("/api/departamentos")
      .then((data) => {
        if (!controlador.signal.aborted) {
          setDepartamentos(data);
          setCargando(false);
        }
      })
      .catch((causa: unknown) => {
        if (controlador.signal.aborted) return;
        setError(causa instanceof Error ? causa.message : "Error al cargar departamentos.");
        setCargando(false);
      });
    return () => controlador.abort();
  }, []);

  useEffect(() => {
    if (!dep) {
      setProvincias([]);
      return;
    }
    const controlador = new AbortController();
    traer(`/api/provincias?dep=${dep}`)
      .then((data) => {
        if (!controlador.signal.aborted) setProvincias(data);
      })
      .catch((causa: unknown) => {
        if (!controlador.signal.aborted) {
          setError(causa instanceof Error ? causa.message : "Error al cargar provincias.");
        }
      });
    return () => controlador.abort();
  }, [dep]);

  useEffect(() => {
    if (!prov) {
      setDistritos([]);
      return;
    }
    const controlador = new AbortController();
    traer(`/api/distritos?prov=${prov}`)
      .then((data) => {
        if (!controlador.signal.aborted) setDistritos(data);
      })
      .catch((causa: unknown) => {
        if (!controlador.signal.aborted) {
          setError(causa instanceof Error ? causa.message : "Error al cargar distritos.");
        }
      });
    return () => controlador.abort();
  }, [prov]);

  return { departamentos, provincias, distritos, cargando, error };
}
