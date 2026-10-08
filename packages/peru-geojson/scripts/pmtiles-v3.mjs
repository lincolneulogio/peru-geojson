import { gzipSync } from "node:zlib";
import { zxyToTileId } from "pmtiles";

const COMPRESION_GZIP = 2;
const TIPO_MVT = 1;

function escribirUint64(buffer, offset, valor) {
  buffer.writeUInt32LE(valor >>> 0, offset);
  buffer.writeUInt32LE(Math.floor(valor / 2 ** 32), offset + 4);
}

function escribirVarint(valor) {
  const bytes = [];
  let pendiente = valor;
  while (pendiente > 127) {
    bytes.push((pendiente & 0x7f) | 0x80);
    pendiente = Math.floor(pendiente / 128);
  }
  bytes.push(pendiente);
  return Buffer.from(bytes);
}

function serializarDirectorio(entradas) {
  const partes = [escribirVarint(entradas.length)];
  let anterior = 0;
  for (const entrada of entradas) {
    partes.push(escribirVarint(entrada.id - anterior));
    anterior = entrada.id;
  }
  for (const entrada of entradas) partes.push(escribirVarint(entrada.longitudRun));
  for (const entrada of entradas) partes.push(escribirVarint(entrada.bytes));
  for (const entrada of entradas) partes.push(escribirVarint(entrada.desplazamiento + 1));
  return Buffer.concat(partes);
}

function encabezado(opciones) {
  const buffer = Buffer.alloc(127);
  buffer.write("PMTiles", 0, "utf8");
  buffer.writeUInt8(3, 7);
  escribirUint64(buffer, 8, opciones.directorioOffset);
  escribirUint64(buffer, 16, opciones.directorioBytes);
  escribirUint64(buffer, 24, opciones.metadataOffset);
  escribirUint64(buffer, 32, opciones.metadataBytes);
  escribirUint64(buffer, 40, opciones.hojasOffset);
  escribirUint64(buffer, 48, opciones.hojasBytes);
  escribirUint64(buffer, 56, opciones.teselasOffset);
  escribirUint64(buffer, 64, opciones.teselasBytes);
  escribirUint64(buffer, 72, opciones.teselas);
  escribirUint64(buffer, 80, opciones.entradas);
  escribirUint64(buffer, 88, opciones.contenidos);
  buffer.writeUInt8(1, 96);
  buffer.writeUInt8(COMPRESION_GZIP, 97);
  buffer.writeUInt8(COMPRESION_GZIP, 98);
  buffer.writeUInt8(TIPO_MVT, 99);
  buffer.writeUInt8(opciones.minZoom, 100);
  buffer.writeUInt8(opciones.maxZoom, 101);
  buffer.writeInt32LE(Math.round(opciones.minLon * 1e7), 102);
  buffer.writeInt32LE(Math.round(opciones.minLat * 1e7), 106);
  buffer.writeInt32LE(Math.round(opciones.maxLon * 1e7), 110);
  buffer.writeInt32LE(Math.round(opciones.maxLat * 1e7), 114);
  buffer.writeUInt8(opciones.zoomCentro, 118);
  buffer.writeInt32LE(Math.round(opciones.centroLon * 1e7), 119);
  buffer.writeInt32LE(Math.round(opciones.centroLat * 1e7), 123);
  return buffer;
}

export function lonLatATesela(lon, lat, zoom) {
  const n = 2 ** zoom;
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return {
    x: Math.min(n - 1, Math.max(0, x)),
    y: Math.min(n - 1, Math.max(0, y)),
  };
}

export function idDeTesela(zoom, x, y) {
  return zxyToTileId(zoom, x, y);
}

/**
 * Escribe un PMTiles v3 con un solo directorio raíz.
 * Las teselas deben llegar ordenadas por id y cada buffer ya está en gzip.
 */
export function escribirPmtiles(opciones) {
  const directorio = gzipSync(serializarDirectorio(opciones.entradas));
  const metadata = gzipSync(Buffer.from(JSON.stringify(opciones.metadata), "utf8"));
  const teselas = Buffer.concat(opciones.blobs);
  const directorioOffset = 127;
  const metadataOffset = directorioOffset + directorio.length;
  const hojasOffset = metadataOffset + metadata.length;
  const teselasOffset = hojasOffset;
  const header = encabezado({
    directorioOffset,
    directorioBytes: directorio.length,
    metadataOffset,
    metadataBytes: metadata.length,
    hojasOffset,
    hojasBytes: 0,
    teselasOffset,
    teselasBytes: teselas.length,
    teselas: opciones.entradas.length,
    entradas: opciones.entradas.length,
    contenidos: opciones.entradas.length,
    minZoom: opciones.minZoom,
    maxZoom: opciones.maxZoom,
    minLon: opciones.bbox[0],
    minLat: opciones.bbox[1],
    maxLon: opciones.bbox[2],
    maxLat: opciones.bbox[3],
    zoomCentro: opciones.zoomCentro,
    centroLon: (opciones.bbox[0] + opciones.bbox[2]) / 2,
    centroLat: (opciones.bbox[1] + opciones.bbox[3]) / 2,
  });
  return Buffer.concat([header, directorio, metadata, teselas]);
}
