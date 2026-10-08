# peru-geojson 📦🇵🇪

Librería TypeScript con los límites del Perú **IDE-INEI 2023** (25 departamentos, 196 provincias, 1890 distritos) + capitales IDEP-2016. Sin dependencias, 100% tipada y tree-shakable.

Licencia de datos: **CC-BY-4.0** — Instituto Nacional de Estadística e Informática (INEI).

## Instalar

```bash
npm i peru-geojson
# o
pnpm add peru-geojson
```

## Usar

```ts
import {
  buscarPorNombre,
  esUbigeoValido,
  filtrarFeatures,
  loadDistrital,
  nivelDeUbigeo,
} from "peru-geojson";

esUbigeoValido("150137"); // true
nivelDeUbigeo("1501"); // "provincial"

const dist = await loadDistrital(); // 1890 features
filtrarFeatures(dist.features, { nivel: "distrital", dep: "15", q: "santa anita" });
```

Esquema canónico por feature: `ubigeo`, `nombre_departamento`, `nombre_provincia`, `nombre_distrito`, `capital` (minúsculas, sin tildes). Detalle del contrato en `contrato.ts` (subpath `./contrato`).

Datos incluidos (`data/`): `peru-*.min.geojson` + `ubigeo.json` + reportes de validación.
