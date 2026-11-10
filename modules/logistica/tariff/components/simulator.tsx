/** @format */

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm, useWatch, type Control } from "react-hook-form";
import { Buttons } from "@repo/ui/buttons/scenes";
import { HiOutlinePlus, HiOutlineTrash } from "react-icons/hi2";
import { GeoCascadeFields } from "@/components/geo-cascade-fields";
import { notify } from "@/components/notifications";
import { ShippingOptionsList, useZoneLabel } from "@/components/shipping-options";
import { get_city_path_action } from "@/server/domains/parametros/georeferencing/actions";
import { quote_shipping_action } from "@/server/domains/shipping_logistics/tariffs/actions";
import type { ShippingQuoteDto } from "@/server/domains/shipping_logistics/tariffs/types";
import { INPUT, num } from "../utils";

export interface TariffWarehouse {
  id: number;
  name: string;
  is_main?: boolean | null;
}

type Piece = { weight_kg: string; length_cm: string; width_cm: string; height_cm: string; quantity: string };
const EMPTY_PIECE: Piece = { weight_kg: "1", length_cm: "", width_cm: "", height_cm: "", quantity: "1" };

/**
 * Simulador: cotiza con el tarifario vigente para un destino del catálogo, una bodega de origen y paquetes escritos a
 * mano. No guarda nada (salvo el registro de destinos sin cobertura).
 */
export const Simulator = ({ warehouses }: { warehouses: TariffWarehouse[] }) => {
  const t = useTranslations("Administre.tariffs.simulator");
  const tCommon = useTranslations("Administre.common");
  const zoneLabel = useZoneLabel();
  const { control, setValue } = useForm<{ country_id: string; state_id: string; city_id: string }>({
    defaultValues: { country_id: "", state_id: "", city_id: "" },
  });
  const geo = useWatch({ control });
  const [origin, setOrigin] = useState("");
  const [pieces, setPieces] = useState<Piece[]>([EMPTY_PIECE]);
  const [declared, setDeclared] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [quote, setQuote] = useState<ShippingQuoteDto | null>(null);
  const [busy, setBusy] = useState(false);

  const setPiece = (index: number, patch: Partial<Piece>) => setPieces((list) => list.map((p, i) => (i === index ? { ...p, ...patch } : p)));

  const run = async () => {
    if (!geo.country_id || !geo.state_id || !geo.city_id) {
      notify.error(tCommon("errorTitle"), t("destinationRequired"));
      return;
    }
    setBusy(true);
    const path = await get_city_path_action(Number(geo.city_id));
    const result = await quote_shipping_action({
      origin_warehouse_id: origin ? Number(origin) : null,
      country_id: Number(geo.country_id),
      state_id: Number(geo.state_id),
      city_id: Number(geo.city_id),
      destination_label: path ? [path.city?.name, path.state?.name].filter(Boolean).join(", ") : null,
      pieces: pieces.map((p) => ({
        weight_kg: num(p.weight_kg),
        length_cm: num(p.length_cm),
        width_cm: num(p.width_cm),
        height_cm: num(p.height_cm),
        quantity: num(p.quantity) ?? 1,
      })),
      declared_value: num(declared),
      order_subtotal: num(subtotal),
    });
    setBusy(false);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    setQuote(result.data);
  };

  const pieceField = (index: number, key: keyof Piece, width = "w-24") => (
    <input value={pieces[index]![key]} inputMode='decimal' aria-label={t(`piece.${key}`)} placeholder={t(`piece.${key}`)}
      onChange={(e) => setPiece(index, { [key]: e.target.value })} className={`${INPUT} ${width} text-right`} />
  );

  return (
    <div className='grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'>
      <form
        className='grid content-start gap-4 rounded-xl border border-border bg-card p-4'
        onSubmit={(event) => {
          event.preventDefault();
          void run();
        }}>
        <div className='grid grid-cols-12 gap-4'>
          <GeoCascadeFields control={control as unknown as Control} setValue={(name, value) => setValue(name as "country_id", value)} />
        </div>
        <label className='grid gap-1 text-xs font-medium text-muted-foreground'>
          {t("origin")}
          <select value={origin} onChange={(e) => setOrigin(e.target.value)} className={INPUT}>
            <option value=''>{t("mainWarehouse")}</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </label>
        <div className='grid gap-2'>
          <span className='text-xs font-medium text-muted-foreground'>{t("pieces")}</span>
          <div className='flex flex-wrap gap-2 text-[11px] text-muted-foreground' aria-hidden='true'>
            <span className='w-24 text-right'>{t("piece.weight_kg")}</span>
            <span className='w-20 text-right'>{t("piece.length_cm")}</span>
            <span className='w-20 text-right'>{t("piece.width_cm")}</span>
            <span className='w-20 text-right'>{t("piece.height_cm")}</span>
            <span className='w-16 text-right'>{t("piece.quantity")}</span>
          </div>
          {pieces.map((_, index) => (
            <div key={index} className='flex flex-wrap items-center gap-2'>
              {pieceField(index, "weight_kg")}
              {pieceField(index, "length_cm", "w-20")}
              {pieceField(index, "width_cm", "w-20")}
              {pieceField(index, "height_cm", "w-20")}
              {pieceField(index, "quantity", "w-16")}
              {pieces.length > 1 ? (
                <Buttons type='button' variant='ghost' size='sm' aria-label={t("removePiece")} onClick={() => setPieces((list) => list.filter((__, i) => i !== index))}>
                  <HiOutlineTrash className='h-4 w-4' aria-hidden='true' />
                </Buttons>
              ) : null}
            </div>
          ))}
          <div>
            <Buttons type='button' variant='outline' size='sm' className='rounded-full' onClick={() => setPieces((list) => [...list, EMPTY_PIECE])}>
              <HiOutlinePlus className='mr-1 h-4 w-4' aria-hidden='true' />
              {t("addPiece")}
            </Buttons>
          </div>
          <p className='text-xs text-muted-foreground'>{t("piecesHint")}</p>
        </div>
        <div className='flex flex-wrap gap-3'>
          <label className='grid gap-1 text-xs font-medium text-muted-foreground'>
            {t("declared")}
            <input value={declared} inputMode='decimal' onChange={(e) => setDeclared(e.target.value)} className={`${INPUT} w-40 text-right`} />
          </label>
          <label className='grid gap-1 text-xs font-medium text-muted-foreground'>
            {t("subtotal")}
            <input value={subtotal} inputMode='decimal' onChange={(e) => setSubtotal(e.target.value)} className={`${INPUT} w-40 text-right`} />
          </label>
        </div>
        <div className='flex justify-end'>
          <Buttons type='submit' className='rounded-full' loading={busy}>{t("run")}</Buttons>
        </div>
      </form>

      <section aria-live='polite' className='grid content-start gap-3'>
        {quote == null ? (
          <p className='rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground'>{t("idle")}</p>
        ) : (
          <>
            <p className='text-sm text-muted-foreground'>{t("zone", { zone: zoneLabel(quote.zone_key, quote.zone_name) })}</p>
            {quote.options.length === 0 ? (
              <p className='rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm'>{t("noCoverage")}</p>
            ) : (
              <ShippingOptionsList options={quote.options} />
            )}
          </>
        )}
      </section>
    </div>
  );
};
