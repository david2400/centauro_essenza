import type { ComponentType } from "react";

/** Ícono de react-icons (o compatible). */
export type NavIcon = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }>;

/**
 * Página del menú.
 *
 * `href` va SIN prefijo de idioma: el `Link` de next-intl agrega el locale activo.
 * `key` es la llave i18n dentro de `Navigation.items.<grupo>`.
 */
export interface NavLeaf {
  key: string;
  href: string;
  /** Sinónimos para el buscador (no se muestran). */
  keywords?: string[];
}

/** Entrada de primer nivel: un enlace directo o un grupo desplegable. */
export interface NavEntry {
  /** Llave i18n en `Navigation.groups`. Única en todo el menú. */
  key: string;
  icon: NavIcon;
  href?: string;
  items?: NavLeaf[];
  keywords?: string[];
}

/** Bloque del sidebar con título opcional (`Navigation.sections`). */
export interface NavSection {
  key: string;
  /** Sin título: se muestra arriba, sin encabezado. */
  untitled?: boolean;
  entries: NavEntry[];
}

/** Acción rápida del buscador (crear algo). Llave en `Navigation.actions`. */
export interface NavAction {
  key: string;
  href: string;
  icon: NavIcon;
  keywords?: string[];
}

/** Resultado plano del buscador, ya traducido. */
export interface NavSearchItem {
  id: string;
  kind: "page" | "action";
  label: string;
  /** Grupo al que pertenece (para mostrar contexto). */
  context: string;
  href: string;
  icon: NavIcon;
  /** Texto normalizado contra el que se busca. */
  haystack: string;
}
