/** @format */

"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Buttons } from "@repo/ui/buttons/scenes";
import { HiOutlinePlus } from "react-icons/hi2";
import {
  list_cities_by_state_action,
  list_countries_action,
  list_states_by_country_action,
} from "@/server/domains/parametros/georeferencing/actions";
import type { GeoOption } from "@/server/domains/parametros/georeferencing/types";
import type { TariffPlaceDto } from "@/server/domains/shipping_logistics/tariffs/types";
import { INPUT } from "../utils";

/**
 * Elige un lugar del catálogo de parametros para una zona: un país entero, un departamento entero o una ciudad.
 * Se agrega el nivel más específico elegido.
 */
export const PlacePicker = ({ onAdd }: { onAdd: (place: TariffPlaceDto) => void }) => {
  const t = useTranslations("Administre.tariffs.zones");
  const tGeo = useTranslations("Geo");
  const [countries, setCountries] = useState<GeoOption[]>([]);
  const [states, setStates] = useState<GeoOption[]>([]);
  const [cities, setCities] = useState<GeoOption[]>([]);
  const [countryId, setCountryId] = useState("");
  const [stateId, setStateId] = useState("");
  const [cityId, setCityId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    list_countries_action()
      .then((data) => {
        if (cancelled) return;
        setCountries(data);
        // Con un solo país (lo habitual) se preselecciona.
        if (data.length === 1) void pickCountry(String(data[0]!.id));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickCountry = async (value: string) => {
    setCountryId(value);
    setStateId("");
    setCityId("");
    setStates([]);
    setCities([]);
    if (value) setStates(await list_states_by_country_action(Number(value)));
  };

  const pickState = async (value: string) => {
    setStateId(value);
    setCityId("");
    setCities([]);
    if (value) setCities(await list_cities_by_state_action(Number(value)));
  };

  const name = (items: GeoOption[], id: string) => items.find((item) => String(item.id) === id)?.name ?? "";

  const add = () => {
    if (!countryId) return;
    const country = name(countries, countryId);
    const state = name(states, stateId);
    const city = name(cities, cityId);
    const label = cityId ? `${city}, ${state}` : stateId ? `${state}, ${country}` : country;
    onAdd({ country_id: Number(countryId), state_id: stateId ? Number(stateId) : null, city_id: cityId ? Number(cityId) : null, label });
    setCityId("");
  };

  if (!loading && countries.length === 0) {
    return <p role='alert' className='rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm'>{tGeo("unavailable")}</p>;
  }

  return (
    <div className='flex flex-wrap items-end gap-2'>
      <label className='grid gap-1 text-xs font-medium text-muted-foreground'>
        {tGeo("country")}
        <select value={countryId} onChange={(e) => void pickCountry(e.target.value)} className={`${INPUT} w-44`} disabled={loading}>
          <option value=''>{loading ? tGeo("loading") : tGeo("selectCountry")}</option>
          {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <label className='grid gap-1 text-xs font-medium text-muted-foreground'>
        {tGeo("state")}
        <select value={stateId} onChange={(e) => void pickState(e.target.value)} className={`${INPUT} w-52`} disabled={!countryId}>
          <option value=''>{t("wholeCountry")}</option>
          {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      <label className='grid gap-1 text-xs font-medium text-muted-foreground'>
        {tGeo("city")}
        <select value={cityId} onChange={(e) => setCityId(e.target.value)} className={`${INPUT} w-52`} disabled={!stateId}>
          <option value=''>{t("wholeState")}</option>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <Buttons type='button' variant='outline' className='rounded-full' disabled={!countryId} onClick={add}>
        <HiOutlinePlus className='mr-1 h-4 w-4' aria-hidden='true' />
        {t("addPlace")}
      </Buttons>
    </div>
  );
};
