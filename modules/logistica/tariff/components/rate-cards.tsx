/** @format */

"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import { Buttons } from "@repo/ui/buttons/scenes";
import { HiOutlinePlus, HiOutlineTruck } from "react-icons/hi2";
import { cn } from "@repo/ui/utils";
import { confirm, notify } from "@/components/notifications";
import { formatApiDate, formatMoney, formatNumber } from "@/lib/format";
import { delete_rate_card_action, save_rate_card_action } from "@/server/domains/shipping_logistics/tariffs/actions";
import type { RateCardDto, TariffZoneDto } from "@/server/domains/shipping_logistics/tariffs/types";
import { INPUT, num, ROUTE_KEYS, text } from "../utils";
import { ZoneRateEditor } from "./zone-rate-editor";

export interface TariffCarrier {
  id: number;
  name: string;
}

type CardDraft = {
  carrier_id: string;
  name: string;
  volumetric_divisor: string;
  default_weight_kg: string;
  min_charge: string;
  insurance_pct: string;
  insurance_min: string;
  active: boolean;
};

const EMPTY: CardDraft = { carrier_id: "", name: "", volumetric_divisor: "5000", default_weight_kg: "1", min_charge: "0", insurance_pct: "0", insurance_min: "0", active: true };

const draftOf = (c: RateCardDto): CardDraft => ({
  carrier_id: String(c.carrier_id),
  name: c.name,
  volumetric_divisor: String(c.volumetric_divisor),
  default_weight_kg: text(c.default_weight_kg),
  min_charge: text(c.min_charge),
  insurance_pct: text(c.insurance_pct),
  insurance_min: text(c.insurance_min),
  active: c.active,
});

interface RateCardsProps {
  cards: RateCardDto[];
  zones: TariffZoneDto[];
  carriers: TariffCarrier[];
  onChange: (cards: RateCardDto[]) => void;
}

/** Tarifarios por transportadora: datos generales (volumétrico, mínimo, seguro) y tarifa por zona con franjas de peso. */
export const RateCards = ({ cards, zones, carriers, onChange }: RateCardsProps) => {
  const t = useTranslations("Administre.tariffs.cards");
  const tZone = useTranslations("Administre.tariffs.routes");
  const tCommon = useTranslations("Administre.common");
  const [selectedId, setSelectedId] = useState<number | null>(cards[0]?.id ?? null);
  const [creating, setCreating] = useState(cards.length === 0);
  const [draft, setDraft] = useState<CardDraft>(EMPTY);
  const [editingCard, setEditingCard] = useState(false);
  const [busy, setBusy] = useState(false);
  const selected = cards.find((c) => c.id === selectedId) ?? null;
  const freeCarriers = useMemo(() => carriers.filter((c) => !cards.some((card) => card.carrier_id === c.id)), [carriers, cards]);

  const replace = (card: RateCardDto) => onChange(cards.some((c) => c.id === card.id) ? cards.map((c) => (c.id === card.id ? card : c)) : [...cards, card]);

  const saveCard = async (id: number | null) => {
    const payload = {
      carrier_id: Number(draft.carrier_id),
      name: draft.name.trim(),
      volumetric_divisor: num(draft.volumetric_divisor),
      default_weight_kg: num(draft.default_weight_kg),
      min_charge: num(draft.min_charge),
      insurance_pct: num(draft.insurance_pct),
      insurance_min: num(draft.insurance_min),
      active: draft.active,
      version: id == null ? null : selected?.version,
    };
    if (!payload.carrier_id) {
      notify.error(tCommon("errorTitle"), t("carrierRequired"));
      return;
    }
    setBusy(true);
    const result = await save_rate_card_action(id, payload);
    setBusy(false);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    replace(result.data);
    setSelectedId(result.data.id);
    setCreating(false);
    setEditingCard(false);
    notify.success(id == null ? tCommon("createdSuccess") : tCommon("updatedSuccess"), result.data.name);
  };

  const removeCard = async (card: RateCardDto) => {
    const ok = await confirm({ title: tCommon("deleteConfirmTitle"), description: t("deleteText", { name: card.name }),
      confirmLabel: tCommon("deleteConfirmButton"), tone: "danger" });
    if (!ok) return;
    setBusy(true);
    const result = await delete_rate_card_action(card.id);
    setBusy(false);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    const rest = cards.filter((c) => c.id !== card.id);
    onChange(rest);
    setSelectedId(rest[0]?.id ?? null);
    notify.success(tCommon("deletedSuccess"), card.name);
  };

  const field = (key: keyof Omit<CardDraft, "active" | "carrier_id" | "name">, mode: "decimal" | "numeric" = "decimal") => (
    <label className='grid gap-1 text-xs font-medium text-muted-foreground'>
      {t(`fields.${key}`)}
      <input value={draft[key]} inputMode={mode} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} className={`${INPUT} w-36 text-right`} />
    </label>
  );

  const cardForm = (id: number | null) => (
    <form
      className='grid gap-4 rounded-xl border border-border bg-card p-4'
      onSubmit={(event) => {
        event.preventDefault();
        void saveCard(id);
      }}>
      <div className='flex flex-wrap items-end gap-3'>
        <label className='grid gap-1 text-xs font-medium text-muted-foreground'>
          {t("fields.carrier")}
          <select value={draft.carrier_id} required onChange={(e) => setDraft({ ...draft, carrier_id: e.target.value,
            name: draft.name || (carriers.find((c) => String(c.id) === e.target.value)?.name ?? "") })} className={`${INPUT} w-56`}>
            <option value=''>{tCommon("selectPlaceholder")}</option>
            {(id == null ? freeCarriers : carriers).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className='grid flex-1 gap-1 text-xs font-medium text-muted-foreground'>
          {t("fields.name")}
          <input value={draft.name} required maxLength={120} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={`${INPUT} min-w-56`} />
        </label>
      </div>
      <div className='flex flex-wrap items-end gap-3'>
        {field("volumetric_divisor", "numeric")}
        {field("default_weight_kg")}
        {field("min_charge")}
        {field("insurance_pct")}
        {field("insurance_min")}
        <label className='flex h-9 items-center gap-2 text-sm'>
          <input type='checkbox' checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} className='h-4 w-4' />
          {tCommon("active")}
        </label>
      </div>
      <p className='text-xs text-muted-foreground'>{t("fieldsHint")}</p>
      <div className='flex justify-end gap-2'>
        <Buttons type='button' variant='outline' className='rounded-full' onClick={() => { setCreating(false); setEditingCard(false); }}>
          {tCommon("cancel")}
        </Buttons>
        <Buttons type='submit' className='rounded-full' loading={busy}>{tCommon("save")}</Buttons>
      </div>
    </form>
  );

  return (
    <div className='grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[260px_minmax(0,1fr)]'>
      <aside className='grid content-start gap-2'>
        {cards.map((card) => (
          <button
            key={card.id}
            type='button'
            onClick={() => { setSelectedId(card.id); setCreating(false); setEditingCard(false); }}
            aria-pressed={card.id === selectedId && !creating}
            className={cn(
              "flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left text-sm transition-colors hover:bg-muted/50",
              card.id === selectedId && !creating && "border-primary/50 bg-primary/5",
              !card.active && "opacity-60",
            )}>
            <HiOutlineTruck className='h-5 w-5 shrink-0 text-muted-foreground' aria-hidden='true' />
            <span className='min-w-0 flex-1'>
              <span className='block truncate font-medium text-foreground'>{card.carrier_name ?? card.name}</span>
              <span className='block truncate text-xs text-muted-foreground'>{t("ratesCount", { count: card.rates.length })}</span>
            </span>
            {!card.active ? <Badge variant='secondary'>{tCommon("inactive")}</Badge> : null}
          </button>
        ))}
        <Buttons type='button' variant='outline' className='rounded-full' disabled={freeCarriers.length === 0}
          onClick={() => { setDraft(EMPTY); setCreating(true); }}>
          <HiOutlinePlus className='mr-1 h-4 w-4' aria-hidden='true' />
          {t("new")}
        </Buttons>
        {freeCarriers.length === 0 ? <p className='text-xs text-muted-foreground'>{t("allCarriersUsed")}</p> : null}
      </aside>

      <div className='grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-4'>
        {creating ? (
          <>
            <h3 className='text-base font-semibold'>{t("newTitle")}</h3>
            {carriers.length === 0 ? <p className='text-sm text-muted-foreground'>{t("noCarriers")}</p> : cardForm(null)}
          </>
        ) : selected ? (
          <>
            {editingCard ? (
              cardForm(selected.id)
            ) : (
              <section className='flex flex-wrap items-start gap-4 rounded-xl border border-border bg-card p-4'>
                <div className='min-w-0 flex-1'>
                  <h3 className='flex flex-wrap items-center gap-2 text-base font-semibold'>
                    {selected.name}
                    <Badge variant={selected.active ? "outline" : "secondary"}>{selected.active ? tCommon("active") : tCommon("inactive")}</Badge>
                  </h3>
                  <p className='text-sm text-muted-foreground'>{selected.carrier_name}</p>
                  <dl className='mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3'>
                    <div><dt className='text-xs text-muted-foreground'>{t("fields.volumetric_divisor")}</dt><dd className='tabular-nums'>{formatNumber(selected.volumetric_divisor)}</dd></div>
                    <div><dt className='text-xs text-muted-foreground'>{t("fields.default_weight_kg")}</dt><dd className='tabular-nums'>{formatNumber(selected.default_weight_kg)} kg</dd></div>
                    <div><dt className='text-xs text-muted-foreground'>{t("fields.min_charge")}</dt><dd className='tabular-nums'>{formatMoney(selected.min_charge)}</dd></div>
                    <div><dt className='text-xs text-muted-foreground'>{t("fields.insurance_pct")}</dt><dd className='tabular-nums'>{formatNumber(selected.insurance_pct)} %</dd></div>
                    <div><dt className='text-xs text-muted-foreground'>{t("fields.insurance_min")}</dt><dd className='tabular-nums'>{formatMoney(selected.insurance_min)}</dd></div>
                  </dl>
                  <p className='mt-3 text-xs text-muted-foreground'>
                    {[selected.updated_by_name, selected.updated_at ? formatApiDate(selected.updated_at) : null].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className='flex gap-2'>
                  <Buttons type='button' variant='outline' size='sm' className='rounded-full' onClick={() => { setDraft(draftOf(selected)); setEditingCard(true); }}>
                    {tCommon("edit")}
                  </Buttons>
                  <Buttons type='button' variant='outline' size='sm' className='rounded-full' loading={busy} onClick={() => void removeCard(selected)}>
                    {tCommon("delete")}
                  </Buttons>
                </div>
              </section>
            )}

            <h3 className='mt-2 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground'>{t("routesTitle")}</h3>
            {ROUTE_KEYS.map((key) => (
              <ZoneRateEditor key={`${selected.id}-${key}-${selected.version}`} card={selected} zoneKey={key} label={tZone(`${key}.name`)}
                hint={tZone(`${key}.hint`)} onSaved={replace} />
            ))}
            <h3 className='mt-2 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground'>{t("zonesTitle")}</h3>
            {zones.length === 0 ? (
              <p className='text-sm text-muted-foreground'>{t("noZones")}</p>
            ) : (
              zones.map((zone) => (
                <ZoneRateEditor key={`${selected.id}-${zone.zone_key}-${selected.version}`} card={selected} zoneKey={zone.zone_key}
                  label={zone.name} hint={zone.places.map((p) => p.label).filter(Boolean).join(" · ") || zone.code} onSaved={replace} />
              ))
            )}
          </>
        ) : (
          <p className='text-sm text-muted-foreground'>{t("empty")}</p>
        )}
      </div>
    </div>
  );
};
