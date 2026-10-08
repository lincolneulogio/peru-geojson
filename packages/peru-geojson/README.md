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

Datos incluidos (`data/`): `peru-*.min.geojson` + `ubigeo.json` + reportes + `indicadores/` + `nombres/` + `equivalencias/ubigeo-2007-2026.json` + `espacial/distritos.json`.

## P0: indicadores, reversa y nombres

```ts
import {
  aNombreOficial, gentilicio, loadNombres,          // nombres oficiales
  coberturaIndicadores, joinIndicadores, loadIndicadoresSocio, // coropletas
  reverseGeocode, loadDistrital,                     // punto → ubigeo
} from "peru-geojson";

// Coropleta honesta (left join; null donde no hay dato oficial)
const tabla = await loadIndicadoresSocio();
const capas = joinIndicadores(dist.features, tabla);
coberturaIndicadores(dist.features, tabla); // { total: 1890, conDatos, pct }

// Geocodificación inversa, cero dependencias (~25 ms / 1890 distritos)
reverseGeocode(dist.features, { lng: -77.0318, lat: -12.0458 });
// → { ubigeo: "150101", nivel: "distrital", exacto: true, ... }

// Nombres presentables (override verificado o reglas; gentilicio o null)
const { sobreescrituras, gentilicios } = await loadNombres();
aNombreOficial("san martin de porres", sobreescrituras); // "San Martín de Porres"
gentilicio("lima", gentilicios); // "limeño"
```

API web: `GET /api/reverse?lat=&lng=[&cercano=1]`.

## Series y vecindad

```ts
import {
  altitudCentroide,
  contenedorGeometrico,
  loadEquivalencias,
  loadEspacialDistritos,
  ubigeoEquivalente,
  vecinosDe,
} from "peru-geojson";

const cruce = await loadEquivalencias();
ubigeoEquivalente(cruce, "160109", "2007"); // "160801"
ubigeoEquivalente(cruce, "070107", "2026"); // null: Mi Perú no existía en 2007
contenedorGeometrico(cruce, "070107"); // "070106", inferido por el centroide

const espacial = await loadEspacialDistritos();
vecinosDe(espacial, "150101");
altitudCentroide(espacial, "150101"); // metros del centroide, no de la capital
```
