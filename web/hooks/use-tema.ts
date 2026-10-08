"use client";

import { useEffect, useState } from "react";

export function useTema(): [boolean, (oscuro: boolean) => void] {
  const [oscuro, setOscuro] = useState(false);
  useEffect(() => {
    setOscuro(document.documentElement.classList.contains("dark"));
  }, []);
  return [oscuro, setOscuro];
}
