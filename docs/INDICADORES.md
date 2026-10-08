# Indicadores por ubigeo

## Estado

| Archivo | Estado | Contenido |
|---|---|---|
| `data/indicadores/geometria.json` | ✅ real-derivado | `area_km2` (exceso esférico, R=6371.0088 km) + `centroide` planar del anillo mayor + `n_vertices`, para 25+196+1890. Validado: suma distrital ≈ 1 291 718 km² vs 1 285 216 oficiales (+0.5%). |
| `data/indicadores/sociodemograficos.json` | ⏳ pendiente-oficial | Vacío válido (`registros: {}`). Se llena con el importador. |
| `data/indicadores/demo-sintetico.json` | ⚠️ demo | **VALORES FALSOS** deterministas para demos de coropletas. Jamás usar como dato real. |
| `data/indicadores/schema.json` | contrato | JSON Schema de validación. |

## Cargar datos oficiales

Fuentes oficiales sugeridas:

* **Población y hogares por distrito**: Censo Nacional 2017, INEI — `https://www.inei.gob.pe/estadisticas/censos/` (resultados definitivos por departamento).
* **Pobreza distrital**: Mapa de Pobreza Monetaria 2018, INEI (estimación de áreas pequeñas).
* **IDH distrital**: Informe PNUD Perú (último disponible).

Prepara un CSV con cabecera exacta y ubigeo de 6 dígitos:

```csv
ubigeo,poblacion,hogares,pobreza_pct,idh,anio,fuente
150101,50000,14000,12.5,0.720,2017,INEI Censo 2017
```

Carga y valida (falla sin escribir a medias si hay ubigeos desconocidos o rangos inválidos):

```bash
python scripts/importar_indicadores.py sources/indicadores/censo2017.csv
```

## Uso en la librería

```ts
import { joinIndicadores, loadIndicadoresSocio, coberturaIndicadores } from "peru-geojson";

const tabla = await loadIndicadoresSocio(); // estado pendiente-oficial → registros {}
const unido = joinIndicadores(distritos.features, tabla); // left join, sin mutar
coberturaIndicadores(distritos.features, tabla); // { total: 1890, conDatos: 0, pct: 0 }
```

Con datos oficiales cargados, el mismo código alimenta coropletas sin cambios.
