"use client";

import type { ReactNode } from "react";
import { usePathname } from "@/shared/i18n/routing";

/** Oculta su contenido (pie de pagina, avisos) en las paginas de login, que van a pantalla completa. */
export function SinAuth({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/auth")) return null;
  return <>{children}</>;
}
