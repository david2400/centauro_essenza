/** @format */

"use client";

import { useState } from "react";

/**
 * Devuelve `true` desde la primera vez que `open` es verdadero y lo mantiene.
 *
 * Sirve para montar un diálogo cargado con `next/dynamic` solo cuando el usuario lo abre
 * (así su código no se descarga con la página) y dejarlo montado después, para que la
 * animación de cierre y las siguientes aperturas sean inmediatas.
 */
export function useMountedOnce(open: boolean): boolean {
  const [mounted, setMounted] = useState(open);
  // Estado derivado durante el render (patrón admitido por React): evita un render extra con useEffect.
  if (open && !mounted) setMounted(true);
  return mounted || open;
}
