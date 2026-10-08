"use client";

interface ThemeToggleProps {
  oscuro: boolean;
  onChange: (oscuro: boolean) => void;
}

export function ThemeToggle({ oscuro, onChange }: ThemeToggleProps) {
  function alternar() {
    const siguiente = !oscuro;
    document.documentElement.classList.toggle("dark", siguiente);
    localStorage.setItem("theme", siguiente ? "dark" : "light");
    onChange(siguiente);
  }

  return (
    <button
      type="button"
      onClick={alternar}
      className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:border-teal-700 hover:text-teal-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:border-teal-400 dark:hover:text-teal-200"
      aria-pressed={oscuro}
    >
      {oscuro ? "Modo claro" : "Modo oscuro"}
    </button>
  );
}
