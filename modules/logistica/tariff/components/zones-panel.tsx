/** @format */

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import { Buttons } from "@repo/ui/buttons/scenes";
import { HiOutlineMapPin, HiOutlinePlus, HiXMark } from "react-icons/hi2";
import { confirm, notify } from "@/components/notifications";
import { delete_tariff_zone_action, save_tariff_zone_action } from "@/server/domains/shipping_logistics/tariffs/actions";
import type { TariffPlaceDto, TariffZoneDto } from "@/server/domains/shipping_logistics/tariffs/types";
import { INPUT } from "../utils";
import { PlacePicker } from "./place-picker";

type Draft = { code: string; name: string; description: string; active: boolean; places: TariffPlaceDto[] };
const EMPTY: Draft = { code: "", name: "", description: "", active: true, places: [] };
const keyOf = (p: TariffPlaceDto) => `${p.country_id}:${p.state_id ?? "*"}:${p.city_id ?? "*"}`;

/**
 * Zonas propias (p. ej. trayecto especial, zona rural): lugares del catálogo que cobran distinto. Un lugar solo puede
 * estar en una zona y gana el más específico (ciudad sobre departamento sobre país).
 */
export const ZonesPanel = ({ zones, onChange }: { zones: TariffZoneDto[]; onChange: (zones: TariffZoneDto[]) => void }) => {
  const t = useTranslations("Administre.tariffs.zones");
  const tCommon = useTranslations("Administre.common");
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const editing = typeof editingId === "number" ? zones.find((z) => z.id === editingId) : undefined;

  const start = (zone?: TariffZoneDto) => {
    setDraft(zone ? { code: zone.code, name: zone.name, description: zone.description ?? "", active: zone.active, places: zone.places } : EMPTY);
    setEditingId(zone ? zone.id : "new");
  };

  const addPlace = (place: TariffPlaceDto) =>
    setDraft((d) => (d.places.some((p) => keyOf(p) === keyOf(place)) ? d : { ...d, places: [...d.places, place] }));

  const save = async () => {
    const id = typeof editingId === "number" ? editingId : null;
    setBusy(true);
    const result = await save_tariff_zone_action(id, {
      code: draft.code,
      name: draft.name,
      description: draft.description || null,
      active: draft.active,
      version: editing?.version ?? null,
      places: draft.places,
    });
    setBusy(false);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    onChange(id == null ? [...zones, result.data] : zones.map((z) => (z.id === id ? result.data : z)));
    setEditingId(null);
    notify.success(id == null ? tCommon("createdSuccess") : tCommon("updatedSuccess"), result.data.name);
  };

  const remove = async (zone: TariffZoneDto) => {
    const ok = await confirm({ title: tCommon("deleteConfirmTitle"), description: tCommon("deleteConfirmText", { name: zone.name }),
      confirmLabel: tCommon("deleteConfirmButton"), tone: "danger" });
    if (!ok) return;
    const result = await delete_tariff_zone_action(zone.id);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    onChange(zones.filter((z) => z.id !== zone.id));
    notify.success(tCommon("deletedSuccess"), zone.name);
  };

  return (
    <div className='grid grid-cols-[minmax(0,1fr)] gap-4'>
      <p className='text-sm text-muted-foreground'>{t("intro")}</p>
      {editingId != null ? (
        <form
          className='grid gap-4 rounded-xl border border-border bg-card p-4'
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}>
          <div className='flex flex-wrap items-end gap-3'>
            <label className='grid gap-1 text-xs font-medium text-muted-foreground'>
              {t("code")}
              <input value={draft.code} required maxLength={30} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
                placeholder='ESPECIAL' className={`${INPUT} w-40 uppercase`} />
            </label>
            <label className='grid flex-1 gap-1 text-xs font-medium text-muted-foreground'>
              {t("name")}
              <input value={draft.name} required maxLength={120} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder={t("namePlaceholder")} className={`${INPUT} min-w-56`} />
            </label>
            <label className='flex h-9 items-center gap-2 text-sm'>
              <input type='checkbox' checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} className='h-4 w-4' />
              {tCommon("active")}
            </label>
          </div>
          <label className='grid gap-1 text-xs font-medium text-muted-foreground'>
            {t("description")}
            <input value={draft.description} maxLength={300} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className={INPUT} />
          </label>
          <div className='grid gap-2'>
            <span className='text-xs font-medium text-muted-foreground'>{t("places", { count: draft.places.length })}</span>
            <PlacePicker onAdd={addPlace} />
            {draft.places.length === 0 ? (
              <p className='text-xs text-muted-foreground'>{t("noPlaces")}</p>
            ) : (
              <ul className='flex flex-wrap gap-2'>
                {draft.places.map((place) => (
                  <li key={keyOf(place)} className='flex items-center gap-1 rounded-full border border-border bg-muted/40 py-1 pl-3 pr-1 text-xs'>
                    <HiOutlineMapPin className='h-3.5 w-3.5 text-muted-foreground' aria-hidden='true' />
                    {place.label ?? keyOf(place)}
                    <button type='button' className='rounded-full p-1 hover:bg-muted' aria-label={t("removePlace", { place: place.label ?? "" })}
                      onClick={() => setDraft((d) => ({ ...d, places: d.places.filter((p) => keyOf(p) !== keyOf(place)) }))}>
                      <HiXMark className='h-3.5 w-3.5' aria-hidden='true' />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className='flex justify-end gap-2'>
            <Buttons type='button' variant='outline' className='rounded-full' onClick={() => setEditingId(null)}>{tCommon("cancel")}</Buttons>
            <Buttons type='submit' className='rounded-full' loading={busy}>{tCommon("save")}</Buttons>
          </div>
        </form>
      ) : (
        <div>
          <Buttons type='button' variant='outline' className='rounded-full' onClick={() => start()}>
            <HiOutlinePlus className='mr-1 h-4 w-4' aria-hidden='true' />
            {t("new")}
          </Buttons>
        </div>
      )}

      {zones.length === 0 ? (
        <p className='text-sm text-muted-foreground'>{t("empty")}</p>
      ) : (
        <ul className='grid gap-2'>
          {zones.map((zone) => (
            <li key={zone.id} className={`flex flex-wrap items-start gap-3 rounded-xl border border-border bg-card p-4 ${zone.active ? "" : "opacity-60"}`}>
              <div className='min-w-0 flex-1'>
                <p className='flex flex-wrap items-center gap-2 font-medium'>
                  {zone.name}
                  <Badge variant='outline'>{zone.code}</Badge>
                  {!zone.active ? <Badge variant='secondary'>{tCommon("inactive")}</Badge> : null}
                </p>
                {zone.description ? <p className='text-xs text-muted-foreground'>{zone.description}</p> : null}
                <p className='mt-1 text-xs text-muted-foreground'>{zone.places.map((p) => p.label).filter(Boolean).join(" · ")}</p>
                <p className='mt-1 text-xs text-muted-foreground'>{t("usedBy", { count: zone.rates_count })}</p>
              </div>
              <div className='flex gap-2'>
                <Buttons type='button' variant='outline' size='sm' className='rounded-full' onClick={() => start(zone)}>{tCommon("edit")}</Buttons>
                <Buttons type='button' variant='outline' size='sm' className='rounded-full' onClick={() => void remove(zone)}>{tCommon("delete")}</Buttons>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
