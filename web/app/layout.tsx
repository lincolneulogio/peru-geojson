import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const descripcion =
  "Visor de departamentos, provincias y distritos del Perú. GeoJSON light, TopoJSON y PMTiles. Límites IDE-INEI, API de ubigeo y licencia CC BY 4.0.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Perú GeoJSON — departamentos, provincias y distritos",
    template: "%s · Perú GeoJSON",
  },
  description: descripcion,
  keywords: ["Perú", "ubigeo", "GeoJSON", "INEI", "distritos", "provincias"],
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

const temaInicial = `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark");}}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: temaInicial }} />
      </head>
      <body className="bg-stone-100 text-stone-900 antialiased dark:bg-stone-950 dark:text-stone-100">
        {children}
      </body>
    </html>
  );
}
