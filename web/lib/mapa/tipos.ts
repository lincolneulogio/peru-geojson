export type ProveedorMapa = "maplibre" | "leaflet";

export interface PropsMapa {
  url: string;
  seleccionado: string;
  oscuro: boolean;
  onSelect: (ubigeo: string) => void;
}
