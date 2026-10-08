export function escaparHtml(valor: string): string {
  return valor.replace(/[&<>"']/g, (caracter) => {
    const mapa: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return mapa[caracter] ?? caracter;
  });
}

export function tituloAmbito(props: Record<string, unknown>): string {
  const distrito = props.NOMBDIST ?? props.nombre_distrito ?? props.nombre;
  const provincia = props.NOMBPROV ?? props.nombre_provincia;
  const departamento = props.NOMBDEP ?? props.nombre_departamento;
  const nombre = [distrito, provincia, departamento].find((valor) => typeof valor === "string" && valor !== "");
  return typeof nombre === "string" ? nombre : "Ámbito";
}

export function ubigeoDe(props: Record<string, unknown> | null | undefined): string {
  const valor = props?.ubigeo;
  return typeof valor === "string" ? valor : "";
}
