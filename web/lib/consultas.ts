import { z } from "zod";

export const consultaDep = z.object({
  dep: z.string().regex(/^\d{2}$/, "dep debe tener 2 dígitos"),
});

export const consultaDistritos = z
  .object({
    dep: z.string().regex(/^\d{2}$/).optional(),
    prov: z.string().regex(/^\d{4}$/).optional(),
  })
  .refine((valor) => Boolean(valor.dep || valor.prov), {
    message: "Indica dep (2 dígitos) o prov (4 dígitos).",
  });

export const consultaBusqueda = z.object({
  q: z.string().trim().min(2).max(80),
});

export const consultaDescarga = z.object({
  nivel: z.enum(["departamental", "provincial", "distrital", "capitales"]),
  ubigeo: z.string().regex(/^\d{2,6}$/).optional(),
});

export const nivelGeo = z.enum(["departamentos", "provincias", "distritos", "capitales"]);

export function leerParametros(request: Request): URLSearchParams {
  return new URL(request.url).searchParams;
}
