/** @format */

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import { Buttons } from "@repo/ui/buttons/scenes";
import { HiOutlinePlus, HiOutlineTrash } from "react-icons/hi2";
import { confirm, notify } from "@/components/notifications";
import { formatMoney, formatNumber } from "@/lib/format";
import { delete_zone_rate_action, save_zone_rate_action } from "@/server/domains/shipping_logistics/tariffs/actions";
import type { RateCardDto, TariffZoneRateDto } from "@/server/domains/shipping_logistics/tariffs/types";
import { INPUT, num, text } from "../utils";

type BracketDraft = { min_kg: string; max_kg: string; price: string; per_kg_over: string };
type Draft = { min_days: string; max_days: string; free_from: string; active: boolean; brackets: BracketDraft[] };

const draftOf = (rate?: TariffZoneRateDto): Draft =>
  rate
    ? {
        min_days: String(rate.min_days),
        max_days: String(rate.max_days),
        free_from: text(rate.free_from),
        active: rate.active,
        brackets: rate.brackets.map((b) => ({ min_kg: text(b.min_kg), max_kg: text(b.max_kg), price: text(b.price), per_kg_over: text(b.per_kg_over) })),
      }
    : { min_days: "1", max_days: "3", free_from: "", active: true, brackets: [{ min_kg: "0", max_kg: "", price: "", per_kg_over: "" }] };

interface ZoneRateEditorProps {
  card: RateCardDto;
  zoneKey: string;
  label: string;
  hint: string;
  onSaved: (card: RateCardDto) => void;
}

/**
 * Tarifa de una zona en un tarifario: días hábiles, envío gratis desde y franjas de peso continuas desde 0 kg (la
 * última puede quedar sin límite y cobrar por kg adicional). Se guarda completa en un paso.
 */
export const ZoneRateEditor = ({ card, zoneKey, label, hint, onSaved }: ZoneRateEditorProps) => {
  const t = useTranslations("Administre.tariffs.rate");
  const tCommon = useTranslations("Administre.common");
  const rate = card.rates.find((r) => r.zone_key === zoneKey);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => draftOf(rate));
  const [busy, setBusy] = useState(false);

  const setBracket = (index: number, patch: Partial<BracketDraft>) =>
    setDraft((d) => {
      const brackets = d.brackets.map((b, i) => (i === index ? { ...b, ...patch } : b));
      // La franja siguiente empieza donde termina esta: así nunca quedan huecos.
      if (patch.max_kg !== undefined && brackets[index + 1]) brackets[index + 1] = { ...brackets[index + 1]!, min_kg: patch.max_kg };
      return { ...d, brackets };
    });

  const addBracket = () =>
    setDraft((d) => {
      const last = d.brackets[d.brackets.length - 1];
      const start = last?.max_kg || String((Number(last?.min_kg || 0) || 0) + 5);
      const brackets = d.brackets.map((b, i) => (i === d.brackets.length - 1 && !b.max_kg ? { ...b, max_kg: start } : b));
      return { ...d, brackets: [...brackets, { min_kg: start, max_kg: "", price: "", per_kg_over: "" }] };
    });

  const removeBracket = (index: number) =>
    setDraft((d) => {
      const brackets = d.brackets.filter((_, i) => i !== index);
      if (brackets[index] && index > 0) brackets[index] = { ...brackets[index]!, min_kg: brackets[index - 1]!.max_kg };
      if (brackets[0]) brackets[0] = { ...brackets[0], min_kg: "0" };
      return { ...d, brackets };
    });

  const save = async () => {
    const brackets = draft.brackets.map((b) => ({ min_kg: num(b.min_kg) ?? 0, max_kg: num(b.max_kg), price: num(b.price) ?? NaN, per_kg_over: num(b.per_kg_over) }));
    if (brackets.some((b) => !Number.isFinite(b.price))) {
      notify.error(tCommon("errorTitle"), t("priceRequired"));
      return;
    }
    setBusy(true);
    const result = await save_zone_rate_action(card.id, zoneKey, {
      version: card.version,
      min_days: num(draft.min_days) ?? 0,
      max_days: num(draft.max_days) ?? num(draft.min_days) ?? 0,
      free_from: num(draft.free_from),
      active: draft.active,
      brackets,
    });
    setBusy(false);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    notify.success(tCommon("updatedSuccess"), label);
    setEditing(false);
    onSaved(result.data);
  };

  const remove = async () => {
    const ok = await confirm({ title: t("deleteTitle", { zone: label }), description: t("deleteText"), confirmLabel: tCommon("deleteConfirmButton"), tone: "danger" });
    if (!ok) return;
    setBusy(true);
    const result = await delete_zone_rate_action(card.id, zoneKey, card.version);
    setBusy(false);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    notify.success(tCommon("deletedSuccess"), label);
    onSaved(result.data);
  };

  return (
    <article className='rounded-xl border border-border bg-card'>
      <header className='flex flex-wrap items-center gap-3 border-b border-border px-4 py-3'>
        <div className='min-w-0 flex-1'>
          <h4 className='flex items-center gap-2 font-medium text-foreground'>
            {label}
            {rate ? (
              <Badge variant={rate.active ? "outline" : "secondary"}>{rate.active ? tCommon("active") : tCommon("inactive")}</Badge>
            ) : (
              <Badge variant='secondary'>{t("none")}</Badge>
            )}
          </h4>
          <p className='text-xs text-muted-foreground'>{hint}</p>
        </div>
        {!editing ? (
          <div className='flex gap-2'>
            <Buttons type='button' variant='outline' size='sm' className='rounded-full'
              onClick={() => { setDraft(draftOf(rate)); setEditing(true); }}>
              {rate ? tCommon("edit") : t("add")}
            </Buttons>
            {rate ? (
              <Buttons type='button' variant='outline' size='sm' className='rounded-full' loading={busy} onClick={() => void remove()}
                aria-label={tCommon("deleteAria", { name: label })}>
                <HiOutlineTrash className='h-4 w-4' aria-hidden='true' />
              </Buttons>
            ) : null}
          </div>
        ) : null}
      </header>

      {!editing && rate ? (
        <div className='overflow-x-auto px-4 py-3 text-sm'>
          <p className='mb-2 text-xs text-muted-foreground'>
            {t("summary", { min: rate.min_days, max: rate.max_days })}
            {rate.free_from != null ? ` · ${t("freeFromValue", { amount: formatMoney(rate.free_from) })}` : ""}
          </p>
          <table className='w-full min-w-[420px]'>
            <thead className='text-left text-xs uppercase tracking-wide text-muted-foreground'>
              <tr>
                <th className='py-1 pr-4 font-medium'>{t("weight")}</th>
                <th className='py-1 pr-4 text-right font-medium'>{t("price")}</th>
                <th className='py-1 text-right font-medium'>{t("perKgOver")}</th>
              </tr>
            </thead>
            <tbody>
              {rate.brackets.map((b) => (
                <tr key={b.min_kg} className='border-t border-border/60'>
                  <td className='py-1.5 pr-4 tabular-nums'>
                    {b.max_kg == null
                      ? b.min_kg === 0 ? t("rangeAll") : t("rangeOpen", { min: formatNumber(b.min_kg) })
                      : b.min_kg === 0 ? t("rangeFirst", { max: formatNumber(b.max_kg) }) : t("range", { min: formatNumber(b.min_kg), max: formatNumber(b.max_kg) })}
                  </td>
                  <td className='py-1.5 pr-4 text-right tabular-nums'>{formatMoney(b.price)}</td>
                  <td className='py-1.5 text-right tabular-nums'>{b.per_kg_over ? formatMoney(b.per_kg_over) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {editing ? (
        <form
          className='grid gap-4 px-4 py-4'
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}>
          <div className='flex flex-wrap items-end gap-3'>
            <label className='grid gap-1 text-xs font-medium text-muted-foreground'>
              {t("minDays")}
              <input value={draft.min_days} inputMode='numeric' onChange={(e) => setDraft({ ...draft, min_days: e.target.value })} className={`${INPUT} w-24 text-right`} />
            </label>
            <label className='grid gap-1 text-xs font-medium text-muted-foreground'>
              {t("maxDays")}
              <input value={draft.max_days} inputMode='numeric' onChange={(e) => setDraft({ ...draft, max_days: e.target.value })} className={`${INPUT} w-24 text-right`} />
            </label>
            <label className='grid gap-1 text-xs font-medium text-muted-foreground'>
              {t("freeFrom")}
              <input value={draft.free_from} inputMode='decimal' placeholder={t("freeFromPlaceholder")}
                onChange={(e) => setDraft({ ...draft, free_from: e.target.value })} className={`${INPUT} w-40 text-right`} />
            </label>
            <label className='flex h-9 items-center gap-2 text-sm'>
              <input type='checkbox' checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} className='h-4 w-4' />
              {tCommon("active")}
            </label>
          </div>

          <div className='overflow-x-auto'>
            <table className='w-full min-w-[560px] text-sm'>
              <thead className='text-left text-xs uppercase tracking-wide text-muted-foreground'>
                <tr>
                  <th className='py-1 pr-2 font-medium'>{t("fromKg")}</th>
                  <th className='py-1 pr-2 font-medium'>{t("toKg")}</th>
                  <th className='py-1 pr-2 font-medium'>{t("price")}</th>
                  <th className='py-1 pr-2 font-medium'>{t("perKgOver")}</th>
                  <th className='py-1' />
                </tr>
              </thead>
              <tbody>
                {draft.brackets.map((b, index) => {
                  const last = index === draft.brackets.length - 1;
                  return (
                    <tr key={index}>
                      <td className='py-1 pr-2'>
                        <input value={b.min_kg} readOnly aria-label={t("fromKg")} className={`${INPUT} w-24 bg-muted/40 text-right`} />
                      </td>
                      <td className='py-1 pr-2'>
                        <input value={b.max_kg} inputMode='decimal' placeholder={last ? t("noLimit") : undefined} aria-label={t("toKg")}
                          onChange={(e) => setBracket(index, { max_kg: e.target.value })} className={`${INPUT} w-24 text-right`} />
                      </td>
                      <td className='py-1 pr-2'>
                        <input value={b.price} inputMode='decimal' aria-label={t("price")} required
                          onChange={(e) => setBracket(index, { price: e.target.value })} className={`${INPUT} w-32 text-right`} />
                      </td>
                      <td className='py-1 pr-2'>
                        <input value={b.per_kg_over} inputMode='decimal' aria-label={t("perKgOver")} placeholder='0'
                          onChange={(e) => setBracket(index, { per_kg_over: e.target.value })} className={`${INPUT} w-32 text-right`} />
                      </td>
                      <td className='py-1 text-right'>
                        {draft.brackets.length > 1 ? (
                          <Buttons type='button' variant='ghost' size='sm' onClick={() => removeBracket(index)} aria-label={t("removeBracket")}>
                            <HiOutlineTrash className='h-4 w-4' aria-hidden='true' />
                          </Buttons>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className='mt-2 text-xs text-muted-foreground'>{t("bracketsHint")}</p>
          </div>

          <div className='flex flex-wrap gap-2'>
            <Buttons type='button' variant='outline' size='sm' className='rounded-full' onClick={addBracket}>
              <HiOutlinePlus className='mr-1 h-4 w-4' aria-hidden='true' />
              {t("addBracket")}
            </Buttons>
            <span className='flex-1' />
            <Buttons type='button' variant='outline' className='rounded-full' onClick={() => setEditing(false)}>
              {tCommon("cancel")}
            </Buttons>
            <Buttons type='submit' className='rounded-full' loading={busy}>
              {tCommon("save")}
            </Buttons>
          </div>
        </form>
      ) : null}
    </article>
  );
};
