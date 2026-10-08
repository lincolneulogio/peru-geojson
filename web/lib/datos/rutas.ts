import path from "node:path";

export function rutaDatos(...partes: string[]): string {
  return path.join(process.cwd(), "..", "data", ...partes);
}
