"use client";

import { useEffect, useState } from "react";
import type { RegistroPublico } from "@/lib/domain/consulta";

interface UseConsultaUbigeoOptions {
  nivel: string;
  q: string;
  padre?: string;
}

interface EstadoConsulta {
  resultados: RegistroPublico[];
  coincidencias: number;
  cargando: boolean;
  qDebounced: string;
}

export function useConsultaUbigeo({ nivel, q, padre }: UseConsultaUbigeoOptions): EstadoConsulta {
  const [qDebounced, setQDebounced] = useState(q);
  const [resultados, setResultados] = useState<RegistroPublico[]>([]);
  const [coincidencias, setCoincidencias] = useState(0);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setQDebounced(q), 250);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    const controlador = new AbortController();
    const params = new URLSearchParams({ nivel, limite: "8" });
    if (qDebounced.trim()) params.set("q", qDebounced.trim());
    if (padre) params.set("padre", padre);
    setCargando(true);
    fetch(`/api/ubigeo?${params.toString()}`, { signal: controlador.signal })
      .then(async (respuesta) => {
        if (!respuesta.ok) throw new Error("consulta");
        return (await respuesta.json()) as { resultados: RegistroPublico[]; coincidencias: number };
      })
      .then((cuerpo) => {
        setResultados(cuerpo.resultados);
        setCoincidencias(cuerpo.coincidencias);
        setCargando(false);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setResultados([]);
        setCoincidencias(0);
        setCargando(false);
      });
    return () => controlador.abort();
  }, [nivel, qDebounced, padre]);

  return { resultados, coincidencias, cargando, qDebounced };
}
