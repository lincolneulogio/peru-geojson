# Este visor se unificó

La aplicación que construye el CI es `web/` (`peru-geojson-visor`). Ahí conviven MapLibre y Leaflet, con un conmutador en la cabecera, y el playground de CSV en `/pintar`.

```bash
pnpm install
pnpm --filter peru-geojson-visor dev
```
