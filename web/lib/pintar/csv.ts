export type NivelTesela = "departamentos" | "provincias" | "distritos";

export interface FilaPintura {
  ubigeo: string;
  valor: number | null;
  etiqueta: string;
  color: string;
}

export interface TablaPintura {
  filas: FilaPintura[];
  nivel: NivelTesela;
  omitidas: number;
  duplicadas: number;
  min: number | null;
  max: number | null;
  tieneValores: boolean;
}

export interface LecturaCsv {
  tabla: TablaPintura | null;
  mensaje: string | null;
}

const LONGITUD: Record<NivelTesela, 2 | 4 | 6> = {
  departamentos: 2,
  provincias: 4,
  distritos: 6,
};

const TOPE = 2500;

const CLARO: [number, number, number] = [204, 251, 241];
const FUERTE: [number, number, number] = [15, 118, 110];
const SIN_VALOR = "#d97706";

export const CSV_EJEMPLO = [
  "ubigeo,valor,etiqueta",
  "01,12,Amazonas",
  "04,40,Arequipa",
  "08,28,Cusco",
  "13,36,La Libertad",
  "15,100,Lima",
  "16,22,Loreto",
  "20,34,Piura",
  "21,26,Puno",
  "25,18,Ucayali",
].join("\n");

function clave(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function separadorDe(linea: string): string {
  const coma = (linea.match(/,/g) ?? []).length;
  const puntoYComa = (linea.match(/;/g) ?? []).length;
  const tab = (linea.match(/\t/g) ?? []).length;
  if (tab >= coma && tab >= puntoYComa && tab > 0) return "\t";
  if (puntoYComa > coma) return ";";
  return ",";
}

function partirLinea(linea: string, separador: string): string[] {
  const celdas: string[] = [];
  let actual = "";
  let comillas = false;
  for (let i = 0; i < linea.length; i += 1) {
    const caracter = linea[i] ?? "";
    if (caracter === '"') {
      if (comillas && linea[i + 1] === '"') {
        actual += '"';
        i += 1;
      } else {
        comillas = !comillas;
      }
      continue;
    }
    if (caracter === separador && !comillas) {
      celdas.push(actual.trim());
      actual = "";
      continue;
    }
    actual += caracter;
  }
  celdas.push(actual.trim());
  return celdas;
}

function nivelDeLongitud(longitud: number): NivelTesela | null {
  if (longitud === 2) return "departamentos";
  if (longitud === 4) return "provincias";
  if (longitud === 6) return "distritos";
  return null;
}

export function normalizarUbigeo(crudo: string): string | null {
  const digitos = crudo.trim().replace(/\D/g, "");
  const candidato =
    digitos.length === 1 || digitos.length === 3 || digitos.length === 5 ? digitos.padStart(digitos.length + 1, "0") : digitos;
  return nivelDeLongitud(candidato.length) ? candidato : null;
}

function indiceColumna(cabeceras: string[], alias: string[]): number {
  return cabeceras.findIndex((cabecera) => alias.includes(cabecera));
}

function pareceCabecera(celdas: string[]): boolean {
  const primera = clave(celdas[0] ?? "");
  if (["ubigeo", "codigo", "cod", "id", "inei"].includes(primera)) return true;
  return normalizarUbigeo(celdas[0] ?? "") === null;
}

function numeroDe(crudo: string): number | null {
  if (!crudo) return null;
  const limpio = crudo.replace(/\s/g, "").replace(",", ".");
  const valor = Number(limpio);
  return Number.isFinite(valor) ? valor : null;
}

function colorEscala(t: number): string {
  const u = Math.min(1, Math.max(0, t));
  const canales = CLARO.map((origen, indice) => Math.round(origen + ((FUERTE[indice] ?? origen) - origen) * u));
  return `#${canales.map((canal) => canal.toString(16).padStart(2, "0")).join("")}`;
}

function nivelMayoritario(longitudes: number[]): NivelTesela {
  const conteo = new Map<NivelTesela, number>();
  for (const longitud of longitudes) {
    const nivel = nivelDeLongitud(longitud);
    if (!nivel) continue;
    conteo.set(nivel, (conteo.get(nivel) ?? 0) + 1);
  }
  let elegido: NivelTesela = "distritos";
  let maximo = -1;
  for (const nivel of ["distritos", "provincias", "departamentos"] as const) {
    const total = conteo.get(nivel) ?? 0;
    if (total > maximo) {
      maximo = total;
      elegido = nivel;
    }
  }
  return elegido;
}

export function interpretarCsv(texto: string): LecturaCsv {
  const limpio = texto.replace(/^\uFEFF/, "").trim();
  if (!limpio) return { tabla: null, mensaje: null };
  const lineas = limpio.split(/\r?\n/).filter((linea) => linea.trim().length > 0 && !linea.trim().startsWith("#"));
  const primera = lineas[0];
  if (!primera) return { tabla: null, mensaje: null };
  const separador = separadorDe(primera);
  const filasCrudas = lineas.map((linea) => partirLinea(linea, separador));
  const cabecera = pareceCabecera(filasCrudas[0] ?? []);
  const encabezados = cabecera ? (filasCrudas[0] ?? []).map((celda) => clave(celda)) : [];
  const cuerpo = cabecera ? filasCrudas.slice(1) : filasCrudas;
  const colUbigeo = cabecera ? indiceColumna(encabezados, ["ubigeo", "codigo", "cod", "id", "inei"]) : 0;
  const colValor = cabecera ? indiceColumna(encabezados, ["valor", "value", "dato", "cantidad", "total"]) : 1;
  const colEtiqueta = cabecera ? indiceColumna(encabezados, ["etiqueta", "nombre", "label", "name"]) : 2;
  if (colUbigeo < 0) {
    return { tabla: null, mensaje: "El CSV necesita una columna ubigeo (o la primera columna, si no hay cabecera)." };
  }

  const vistos = new Map<string, { valor: number | null; etiqueta: string }>();
  let omitidas = 0;
  let duplicadas = 0;
  for (const celdas of cuerpo) {
    const ubigeo = normalizarUbigeo(celdas[colUbigeo] ?? "");
    if (!ubigeo) {
      if ((celdas[colUbigeo] ?? "").trim()) omitidas += 1;
      continue;
    }
    if (vistos.has(ubigeo)) duplicadas += 1;
    const valor = colValor >= 0 ? numeroDe(celdas[colValor] ?? "") : null;
    const etiqueta = colEtiqueta >= 0 ? (celdas[colEtiqueta] ?? "") : "";
    vistos.set(ubigeo, { valor, etiqueta });
    if (vistos.size > TOPE) {
      return { tabla: null, mensaje: `El playground acepta hasta ${TOPE} ubigeos por archivo.` };
    }
  }
  if (vistos.size === 0) {
    return { tabla: null, mensaje: "No hay ubigeos válidos. Usa 2, 4 o 6 dígitos." };
  }

  const nivel = nivelMayoritario([...vistos.keys()].map((ubigeo) => ubigeo.length));
  const delNivel = [...vistos.entries()].filter(([ubigeo]) => ubigeo.length === LONGITUD[nivel]);
  const fuera = vistos.size - delNivel.length;
  const valores = delNivel.map(([, fila]) => fila.valor).filter((valor): valor is number => valor !== null);
  const min = valores.length > 0 ? Math.min(...valores) : null;
  const max = valores.length > 0 ? Math.max(...valores) : null;
  const span = min !== null && max !== null ? max - min : 0;
  const filas: FilaPintura[] = delNivel
    .map(([ubigeo, fila]) => {
      let color = "#0f766e";
      if (min !== null && max !== null && fila.valor !== null) {
        color = span === 0 ? colorEscala(0.65) : colorEscala((fila.valor - min) / span);
      } else if (valores.length > 0 && fila.valor === null) {
        color = SIN_VALOR;
      }
      return { ubigeo, valor: fila.valor, etiqueta: fila.etiqueta, color };
    })
    .sort((a, b) => a.ubigeo.localeCompare(b.ubigeo, "es"));

  const avisos: string[] = [];
  if (omitidas > 0) avisos.push(`${omitidas} filas no tenían un ubigeo válido.`);
  if (fuera > 0) avisos.push(`Se omitieron ${fuera} ubigeos de otro nivel.`);
  if (duplicadas > 0) avisos.push(`${duplicadas} ubigeos repetidos: quedó el último.`);
  return {
    tabla: {
      filas,
      nivel,
      omitidas: omitidas + fuera,
      duplicadas,
      min,
      max,
      tieneValores: valores.length > 0,
    },
    mensaje: avisos.length > 0 ? avisos.join(" ") : null,
  };
}

export function colorVacio(oscuro: boolean): string {
  return oscuro ? "#292524" : "#f5f5f4";
}

export function colorEscalaPublica(t: number): string {
  return colorEscala(t);
}
