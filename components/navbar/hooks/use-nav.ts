"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { NAV_ACTIONS, NAV_SECTIONS } from "../config/nav-items";
import type { NavSearchItem } from "../models/nav.types";
import { isEditableTarget, normalize } from "../utils/nav.utils";

const COLLAPSED_KEY = "essenza.nav.collapsed";

/**
 * Estado contraído del sidebar, recordado por navegador.
 * Arranca expandido y lee la preferencia después de montar para que el HTML del
 * servidor y el del cliente coincidan.
 */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = React.useState(false);

  React.useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSED_KEY) === "1");
    } catch {
      // Almacenamiento bloqueado (modo privado): se queda expandido.
    }
  }, []);

  const toggle = React.useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // Sin almacenamiento: el cambio dura hasta recargar.
      }
      return next;
    });
  }, []);

  return { collapsed, toggle };
}

/** Atajo Ctrl/⌘ + tecla. `allowInFields` deja que funcione aunque el foco esté en un input. */
export function useHotkey(key: string, handler: () => void, { allowInFields = false } = {}) {
  const handlerRef = React.useRef(handler);
  React.useEffect(() => {
    handlerRef.current = handler;
  });

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      if (event.key.toLowerCase() !== key) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.isContentEditable) return;
      if (!allowInFields && isEditableTarget(target)) return;
      event.preventDefault();
      handlerRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key, allowInFields]);
}

/** "⌘" en Mac, "Ctrl" en el resto. Se resuelve en el cliente. */
export function useModKey() {
  const [mod, setMod] = React.useState("Ctrl");
  React.useEffect(() => {
    if (/Mac|iPhone|iPad/i.test(navigator.userAgent)) setMod("⌘");
  }, []);
  return mod;
}

/** Lista plana y traducida de páginas y acciones para el buscador. */
export function useNavSearchItems(): NavSearchItem[] {
  const t = useTranslations("Navigation");
  return React.useMemo(() => {
    const items: NavSearchItem[] = [];
    const actionsLabel = t("search.actions");
    for (const action of NAV_ACTIONS) {
      const label = t(`actions.${action.key}`);
      items.push({
        id: `action:${action.key}`,
        kind: "action",
        label,
        context: actionsLabel,
        href: action.href,
        icon: action.icon,
        haystack: normalize([label, ...(action.keywords ?? [])].join(" ")),
      });
    }
    for (const section of NAV_SECTIONS) {
      for (const entry of section.entries) {
        const group = t(`groups.${entry.key}`);
        if (entry.href) {
          items.push({
            id: `page:${entry.key}`,
            kind: "page",
            label: group,
            context: t("search.general"),
            href: entry.href,
            icon: entry.icon,
            haystack: normalize([group, ...(entry.keywords ?? [])].join(" ")),
          });
        }
        for (const leaf of entry.items ?? []) {
          const label = t(`items.${entry.key}.${leaf.key}`);
          items.push({
            id: `page:${entry.key}.${leaf.key}`,
            kind: "page",
            label,
            context: group,
            href: leaf.href,
            icon: entry.icon,
            haystack: normalize([label, group, ...(leaf.keywords ?? [])].join(" ")),
          });
        }
      }
    }
    return items;
  }, [t]);
}
