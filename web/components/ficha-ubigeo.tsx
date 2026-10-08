import type { UbigeoResource } from "@/lib/recursos/ubigeo";
import { nombreVisible } from "@/lib/recursos/ubigeo";

interface FichaUbigeoProps {
  registro: UbigeoResource | null;
  descarga: string;
}

export function FichaUbigeo({ registro, descarga }: FichaUbigeoProps) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-950">
      {registro ? (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-teal-800 uppercase dark:text-teal-300">
              {registro.nivel}
            </p>
            <h2 className="text-xl font-semibold tracking-tight">{registro.nombre}</h2>
            <p className="font-mono text-sm text-stone-500">{registro.ubigeo}</p>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-stone-500">Departamento</dt>
              <dd>{nombreVisible(registro.nombre_departamento)}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Provincia</dt>
              <dd>{registro.nombre_provincia ? nombreVisible(registro.nombre_provincia) : "—"}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Distrito</dt>
              <dd>{registro.nombre_distrito ? nombreVisible(registro.nombre_distrito) : "—"}</dd>
            </div>
            <div>
              <dt className="text-stone-500">Capital</dt>
              <dd>{registro.capital ? nombreVisible(registro.capital) : "Sin dato"}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <p className="text-sm text-stone-600 dark:text-stone-300">
          Elige un departamento, una provincia o un distrito. También puedes pulsar el mapa.
        </p>
      )}
      <a
        href={descarga}
        className="mt-4 inline-flex rounded-full bg-teal-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 dark:bg-teal-500 dark:text-stone-950 dark:hover:bg-teal-300"
      >
        Descargar GeoJSON filtrado
      </a>
    </section>
  );
}
