# Nombres oficiales y gentilicios

El pipeline emite minúsculas sin tildes (`san martin de porres`). Para UI formal se usa `aNombreOficial()` + `gentilicio()` de la librería.

## Reglas de `aNombreOficial` (deterministas)

1. Si el nombre está en `data/nombres/sobreescrituras.json` → se usa tal cual (verificado contra datos por `scripts/sembrar_demo.py`).
2. Si no: Title-Case con conectores en minúscula (`de, del, la, el, los, las, y, e, en, al`) y números romanos en mayúsculas (`ii, iii, iv, ix`…).

Lo que las reglas **no pueden** hacer (tildes impredecibles): va al archivo de sobreescrituras.

## Gentilicios

`data/nombres/gentilicios.json` cubre los 25 departamentos verificados. `madre de dios` es `null` a propósito: la función retorna `null` en vez de inventar. Para provincias/distritos retorna `null` hasta que la comunidad aporte entradas verificadas.

## Cómo contribuir (obligatorio para aceptar entradas)

1. Añade la clave en minúsculas sin tildes → valor oficial con tildes.
2. Cita la fuente (ordenanza municipal, INEI, RAE para gentilicios).
3. Corre `python scripts/sembrar_demo.py`: falla si la clave no existe en los datos.
4. Añade un test en `packages/peru-geojson/test/core.test.mjs`.

```ts
import { aNombreOficial, gentilicio } from "peru-geojson";

aNombreOficial("san martin de porres", overrides); // "San Martín de Porres"
aNombreOficial("santa rosa de lima", overrides); // "Santa Rosa de Lima" (reglas)
gentilicio("lima", mapa); // "limeño"
gentilicio("madre de dios", mapa); // null (no verificado)
```
