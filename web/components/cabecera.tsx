"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

interface CabeceraProps {
  anio: string;
  oscuro: boolean;
  onTema: (oscuro: boolean) => void;
  children?: ReactNode;
}

const ENLACES = [
  { href: "/", etiqueta: "Visor" },
  { href: "/pintar", etiqueta: "Pintar por CSV" },
];

export function Cabecera({ anio, oscuro, onTema, children }: CabeceraProps) {
  const ruta = usePathname();
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-4 py-3 md:px-6 dark:border-stone-800">
      <div className="flex min-w-0 flex-col gap-2">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-teal-800 uppercase dark:text-teal-300">
            IDE-INEI · límites {anio} · EPSG:4326
          </p>
          <h1 className="text-lg font-semibold tracking-tight md:text-xl">Perú GeoJSON</h1>
        </div>
        <nav className="flex flex-wrap gap-1" aria-label="Secciones">
          {ENLACES.map((enlace) => {
            const activo = ruta === enlace.href;
            return (
              <Link
                key={enlace.href}
                href={enlace.href}
                aria-current={activo ? "page" : undefined}
                className={
                  activo
                    ? "rounded-full bg-teal-800 px-3 py-1 text-sm font-semibold text-white dark:bg-teal-500 dark:text-stone-950"
                    : "rounded-full px-3 py-1 text-sm font-medium text-stone-600 hover:bg-stone-200 dark:text-stone-300 dark:hover:bg-stone-800"
                }
              >
                {enlace.etiqueta}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <ThemeToggle oscuro={oscuro} onChange={onTema} />
      </div>
    </header>
  );
}
