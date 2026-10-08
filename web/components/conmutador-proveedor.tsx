"use client";

import type { ProveedorMapa } from "@/lib/mapa/tipos";

interface ConmutadorProveedorProps {
  valor: ProveedorMapa;
  onChange: (valor: ProveedorMapa) => void;
}

const OPCIONES: Array<{ id: ProveedorMapa; etiqueta: string }> = [
  { id: "maplibre", etiqueta: "MapLibre" },
  { id: "leaflet", etiqueta: "Leaflet" },
];

export function ConmutadorProveedor({ valor, onChange }: ConmutadorProveedorProps) {
  return (
    <div
      role="group"
      aria-label="Proveedor del mapa"
      className="inline-flex rounded-full border border-stone-300 bg-white p-0.5 dark:border-stone-700 dark:bg-stone-900"
    >
      {OPCIONES.map((opcion) => {
        const activo = valor === opcion.id;
        return (
          <button
            key={opcion.id}
            type="button"
            aria-pressed={activo}
            onClick={() => onChange(opcion.id)}
            className={
              activo
                ? "rounded-full bg-stone-900 px-3 py-1.5 text-sm font-semibold text-white dark:bg-stone-100 dark:text-stone-950"
                : "rounded-full px-3 py-1.5 text-sm font-medium text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white"
            }
          >
            {opcion.etiqueta}
          </button>
        );
      })}
    </div>
  );
}
