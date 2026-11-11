/** @format */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { Control } from "react-hook-form";
import { FormSelectField } from "@repo/ui/form/scenes/form-select";
import {
  list_cities_by_state_action,
  list_countries_action,
  list_states_by_country_action,
} from "@/server/domains/parametros/georeferencing/actions";
import type { GeoOption } from "@/server/domains/parametros/georeferencing/types";

/**
 * Selectores en cascada país → departamento → ciudad, respaldados por el
 * catálogo del servicio `parametros` (TerritoryLookupController).
 * Adaptado de apps/draco (`modules/shared/components/geo-cascade-fields`):
 * genérico en los nombres de campo para poder reutilizarse en otros
 * formularios (bodegas, proveedores, direcciones de despacho…).
 *
 * Los tres valores se guardan como string (valor del select); el formulario
 * los convierte a número al enviar.
 */
interface GeoCascadeFieldsProps {
  /** Los formularios lo pasan como `Control` genérico: los nombres de campo son configurables. */
  control: Control;
  setValue: (name: string, value: string) => void;
  initialCountryId?: string;
  initialStateId?: string;
  countryFieldName?: string;
  stateFieldName?: string;
  cityFieldName?: string;
  className?: string;
}

const toOptions = (items: GeoOption[]) =>
  items.map((item) => ({
    id: String(item.id),
    value: String(item.id),
    label: item.code ? `${item.name} (${item.code})` : item.name,
  }));

export const GeoCascadeFields = ({
  control,
  setValue,
  initialCountryId = "",
  initialStateId = "",
  countryFieldName = "country_id",
  stateFieldName = "state_id",
  cityFieldName = "city_id",
  className = "col-span-12 grid grid-cols-1 gap-4 md:grid-cols-3",
}: GeoCascadeFieldsProps) => {
  const t = useTranslations("Geo");

  const [countries, setCountries] = useState<GeoOption[]>([]);
  const [states, setStates] = useState<GeoOption[]>([]);
  const [cities, setCities] = useState<GeoOption[]>([]);
  const [countryId, setCountryId] = useState(initialCountryId);
  const [stateId, setStateId] = useState(initialStateId);
  const [loading, setLoading] = useState({ countries: true, states: false, cities: false });

  useEffect(() => {
    let cancelled = false;
    list_countries_action()
      .then((data) => !cancelled && setCountries(data))
      .finally(() => !cancelled && setLoading((prev) => ({ ...prev, countries: false })));
    return () => {
      cancelled = true;
    };
  }, []);

  // Al editar, precarga departamentos y ciudades de los valores guardados.
  useEffect(() => {
    let cancelled = false;
    if (initialCountryId) {
      list_states_by_country_action(Number(initialCountryId)).then((data) => !cancelled && setStates(data));
    }
    if (initialStateId) {
      list_cities_by_state_action(Number(initialStateId)).then((data) => !cancelled && setCities(data));
    }
    return () => {
      cancelled = true;
    };
  }, [initialCountryId, initialStateId]);

  const handleCountryChange = (value: string) => {
    if (value === countryId) return;
    setCountryId(value);
    setStateId("");
    setStates([]);
    setCities([]);
    setValue(stateFieldName, "");
    setValue(cityFieldName, "");
    if (!value) return;

    setLoading((prev) => ({ ...prev, states: true }));
    list_states_by_country_action(Number(value))
      .then(setStates)
      .finally(() => setLoading((prev) => ({ ...prev, states: false })));
  };

  const handleStateChange = (value: string) => {
    if (value === stateId) return;
    setStateId(value);
    setCities([]);
    setValue(cityFieldName, "");
    if (!value) return;

    setLoading((prev) => ({ ...prev, cities: true }));
    list_cities_by_state_action(Number(value))
      .then(setCities)
      .finally(() => setLoading((prev) => ({ ...prev, cities: false })));
  };

  const options = useMemo(
    () => ({ countries: toOptions(countries), states: toOptions(states), cities: toOptions(cities) }),
    [countries, states, cities],
  );

  const catalogUnavailable = !loading.countries && countries.length === 0;

  return (
    <div className={className}>
      {catalogUnavailable ? (
        <p
          role='alert'
          className='rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-foreground md:col-span-3'>
          {t("unavailable")}
        </p>
      ) : null}
      <FormSelectField
        controller={{ control, name: countryFieldName }}
        label={t("country")}
        placeholder={loading.countries ? t("loading") : t("selectCountry")}
        data={options.countries}
        searchable
        emptyMessage={t("empty")}
        onValueChange={handleCountryChange}
        triggerClassName='!w-full'
      />
      <FormSelectField
        controller={{ control, name: stateFieldName }}
        label={t("state")}
        placeholder={
          loading.states ? t("loading") : countryId ? t("selectState") : t("selectCountryFirst")
        }
        data={options.states}
        searchable
        emptyMessage={t("empty")}
        disabled={!countryId || loading.states}
        onValueChange={handleStateChange}
        triggerClassName='!w-full'
      />
      <FormSelectField
        controller={{ control, name: cityFieldName }}
        label={t("city")}
        placeholder={loading.cities ? t("loading") : stateId ? t("selectCity") : t("selectStateFirst")}
        data={options.cities}
        searchable
        emptyMessage={t("empty")}
        disabled={!stateId || loading.cities}
        triggerClassName='!w-full'
      />
    </div>
  );
};
