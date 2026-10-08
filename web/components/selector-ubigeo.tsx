interface OpcionUbigeo {
  ubigeo: string;
  nombre: string;
}

interface SelectorUbigeoProps {
  id: string;
  etiqueta: string;
  valor: string;
  opciones: OpcionUbigeo[];
  deshabilitado?: boolean;
  placeholder: string;
  onChange: (valor: string) => void;
}

export function SelectorUbigeo({
  id,
  etiqueta,
  valor,
  opciones,
  deshabilitado = false,
  placeholder,
  onChange,
}: SelectorUbigeoProps) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold tracking-wide text-stone-500 uppercase dark:text-stone-400">
        {etiqueta}
      </span>
      <select
        id={id}
        value={valor}
        disabled={deshabilitado}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-700 dark:bg-stone-950 dark:focus:border-teal-400"
      >
        <option value="">{placeholder}</option>
        {opciones.map((opcion) => (
          <option key={opcion.ubigeo} value={opcion.ubigeo}>
            {opcion.ubigeo} · {opcion.nombre}
          </option>
        ))}
      </select>
    </label>
  );
}
