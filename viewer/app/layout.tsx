import type { Metadata } from "next";
import type { JSX, ReactNode } from "react";
import { Providers } from "@/components/Providers";
import { ThemeToggle } from "@/components/ThemeToggle";
import { urlDelSitio } from "@/lib/sitio";
import "./globals.css";

const descripcion =
  "Departamentos, provincias y distritos del Perú en GeoJSON light, TopoJSON y PMTiles. Visor responsive con modo oscuro y API /api/ubigeo. Datos INEI, licencia CC BY 4.0.";

export const metadata: Metadata = {
  metadataBase: new URL(urlDelSitio()),
  title: {
    default: "Perú GeoJSON — departamentos, provincias y distritos",
    template: "%s · Perú GeoJSON",
  },
  description: descripcion,
  keywords: ["Perú", "ubigeo", "GeoJSON", "TopoJSON", "PMTiles", "INEI", "distritos"],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Perú GeoJSON",
    description: descripcion,
    type: "website",
    locale: "es_PE",
    url: "/",
  },
  twitter: { card: "summary", title: "Perú GeoJSON", description: descripcion },
  robots: { index: true, follow: true },
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): JSX.Element {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <Providers>
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
              <div>
                <h1 className="text-base font-bold sm:text-lg">🇵🇪 Perú GeoJSON — Visor v2</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Departamentos · Provincias · Distritos · Capitales
                </p>
              </div>
              <ThemeToggle />
            </div>
          </header>
          <main className="mx-auto max-w-7xl space-y-4 px-4 py-6">{children}</main>
          <footer className="mx-auto max-w-7xl px-4 pb-8 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Límites IDE-INEI 2023 · Capitales IDEP-2016 ·{" "}
            <a className="underline" href="https://creativecommons.org/licenses/by/4.0/">
              CC BY 4.0
            </a>{" "}
            · Atribución: INEI. Código del visor bajo MIT.
          </footer>
        </Providers>
      </body>
    </html>
  );
}
