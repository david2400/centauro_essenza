/** @format */

"use client";

import { useEffect, useState } from "react";
import {
  list_cities_by_state_action,
  list_countries_action,
  list_states_by_country_action,
} from "@/server/domains/parametros/georeferencing/actions";
import type { GeoOption } from "@/server/domains/parametros/georeferencing/types";

export interface GeoMatch {
  countryId: string;
  stateId: string;
  /** Vacío si la ciudad escrita no se encontró en el departamento. */
  cityId: string;
}

/** "Bogotá, D.C." y "bogota dc" deben coincidir: sin tildes, signos ni mayúsculas. */
const key = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const find = (items: GeoOption[], name: string) => {
  const wanted = key(name);
  if (!wanted) return undefined;
  return items.find((item) => key(item.name) === wanted) ?? items.find((item) => key(item.name).startsWith(`${wanted} `));
};

/** País por defecto: el único del catálogo, o Colombia (la facturación es ante la DIAN). */
const pickCountry = (countries: GeoOption[]) =>
  countries.length === 1
    ? countries[0]
    : countries.find((c) => ["co", "col", "170"].includes(key(c.code ?? ""))) ?? countries.find((c) => key(c.name) === "colombia");

/**
 * La configuración guardada antes del catálogo solo tiene ciudad y departamento escritos.
 * Busca esos nombres en el catálogo de parametros para precargar los selectores; si no los
 * encuentra devuelve null y el formulario deja que el usuario los elija.
 */
export function useLegacyGeoMatch(city: string, department: string, enabled: boolean) {
  const [match, setMatch] = useState<GeoMatch | null>(null);
  const [searching, setSearching] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setSearching(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const country = pickCountry(await list_countries_action());
      if (!country) return null;
      const states = await list_states_by_country_action(country.id);
      // Sin departamento escrito (p. ej. "Bogotá") se intenta con el nombre de la ciudad.
      const state = find(states, department) ?? find(states, city);
      if (!state) return null;
      const cities = await list_cities_by_state_action(state.id);
      const found = find(cities, city) ?? (cities.length === 1 ? cities[0] : undefined);
      return { countryId: String(country.id), stateId: String(state.id), cityId: found ? String(found.id) : "" };
    })()
      .then((result) => {
        if (!cancelled) setMatch(result);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [city, department, enabled]);

  return { match, searching };
}
