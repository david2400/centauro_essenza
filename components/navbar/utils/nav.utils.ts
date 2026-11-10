import type { NavEntry, NavSearchItem, NavSection } from "../models/nav.types";

/** Ruta activa: exacta o un subnivel (`/ventas/orders/new` activa "Órdenes"). */
export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Grupo que contiene la ruta actual, si hay alguno. */
export function activeEntryKey(sections: NavSection[], pathname: string): string | null {
  for (const section of sections) {
    for (const entry of section.entries) {
      if (entryIsActive(entry, pathname)) return entry.key;
    }
  }
  return null;
}

export function entryIsActive(entry: NavEntry, pathname: string) {
  if (entry.href) return isActive(pathname, entry.href);
  return (entry.items ?? []).some((leaf) => isActive(pathname, leaf.href));
}

/** Minúsculas y sin tildes: "Categorías" y "categorias" deben coincidir. */
export function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Filtra y ordena resultados. Todas las palabras de la consulta deben aparecer;
 * se priorizan las coincidencias al inicio del nombre.
 */
export function searchNav(items: NavSearchItem[], query: string): NavSearchItem[] {
  const q = normalize(query);
  if (!q) return items;
  const tokens = q.split(/\s+/).filter(Boolean);
  return items
    .map((item) => {
      if (!tokens.every((token) => item.haystack.includes(token))) return null;
      const label = normalize(item.label);
      let score = 0;
      if (label.startsWith(q)) score += 100;
      else if (label.includes(q)) score += 60;
      for (const token of tokens) {
        if (label.split(/\s+/).some((word) => word.startsWith(token))) score += 10;
      }
      if (item.kind === "action") score -= 5;
      return { item, score };
    })
    .filter((match): match is { item: NavSearchItem; score: number } => match !== null)
    .sort((a, b) => b.score - a.score)
    .map((match) => match.item);
}

/** Iniciales para el avatar: "Ana Prueba" -> "AP", "demo" -> "DE". */
export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  return (parts[0] ?? "?").slice(0, 2).toUpperCase();
}

/** El foco está en un campo de texto o editor: no robar atajos de teclado. */
export function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
