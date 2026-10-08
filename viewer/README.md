# Visor Perú GeoJSON (Next.js 16)

Visor moderno del dataset canónico `data/v2/` con App Router, Tailwind, modo oscuro y responsive.

Stack: **Next.js 16.4.0 estable (Turbopack) · React 19.3.0 · TailwindCSS 3.4 · Leaflet 1.9 · next-themes 0.4**.

## Arquitectura limpia

* `app/page.tsx` (Server Component) lee stats/catálogos una vez en servidor.
* `app/api/geo/route.ts` (Resource Controller delgado) delega todo a `lib/services/geo-service.ts`.
* `lib/services/geo-service.ts` concentra filtrado + búsqueda por ubigeo.
* `hooks/useGeoExplorer.ts` aísla el estado fuera del JSX.
* `components/*` pequeños, props tipadas y `memo` para evitar re-renders.
* `components/MapView.tsx` es Client Component con `dynamic(ssr:false)` + Leaflet.

## Uso

```bash
pnpm install
pnpm --filter peru-geojson-viewer sync-data
pnpm --filter peru-geojson-viewer dev
pnpm --filter peru-geojson-viewer build
pnpm --filter peru-geojson-viewer lint
```

API:

* `GET /api/geo?nivel=departamental|provincial|distrital|capitales&q=1501&dep=15&prov=1501`

## Notas de migración Next 14 → 16

* React 18 → 19: se importa `type { JSX }` desde `react` (el namespace global `JSX` ya no existe).
* `next lint` eliminado: el script `lint` ahora es `tsc --noEmit`.
* `tsconfig.json` ajustado por Next 16: `jsx: react-jsx`, `target: ES2017`.
* Sin cambios visuales ni de rutas: mismo App Router, mismo mapa y misma API.
