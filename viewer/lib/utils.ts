export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function formatNum(n: number): string {
  return new Intl.NumberFormat("es-PE").format(n);
}
