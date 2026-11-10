/** @format */

"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ShippingOptionsList, useZoneLabel } from "@/components/shipping-options";
import { Link } from "@/shared/i18n/routing";
import { quote_order_shipping_action } from "@/server/domains/shipping_logistics/tariffs/actions";
import type { ShippingOptionDto, ShippingQuoteDto } from "@/server/domains/shipping_logistics/tariffs/types";

interface OrderShippingOptionsProps {
  orderId?: number | null;
  countryId: string;
  stateId: string;
  cityId: string;
  warehouseId: string;
  subtotal: number;
  lines: { sku_id?: number | null; quantity: number }[];
  /** Transportadora elegida en el formulario (para resaltar la opción). */
  carrierId: string;
  /** Sin transportadora ni valor aún: la opción más económica se aplica sola. */
  autoApply: boolean;
  editable: boolean;
  onApply: (option: ShippingOptionDto) => void;
}

/**
 * Opciones de envío de la orden con el tarifario de logística. Se recalculan solas al cambiar la ciudad, las líneas o
 * la bodega; al elegir una se llenan transportadora, costo y fecha prometida (se pueden ajustar a mano).
 */
export const OrderShippingOptions = ({
  orderId,
  countryId,
  stateId,
  cityId,
  warehouseId,
  subtotal,
  lines,
  carrierId,
  autoApply,
  editable,
  onApply,
}: OrderShippingOptionsProps) => {
  const t = useTranslations("Administre.order.shippingQuote");
  const zoneLabel = useZoneLabel();
  const [quote, setQuote] = useState<ShippingQuoteDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const applyRef = useRef({ autoApply, onApply });
  useEffect(() => {
    applyRef.current = { autoApply, onApply };
  });
  const ready = Boolean(countryId && stateId && cityId);
  const linesKey = JSON.stringify(lines.map((l) => [l.sku_id ?? null, l.quantity]));

  useEffect(() => {
    if (!ready) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    // Espera a que el usuario termine de cambiar cantidades antes de cotizar.
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      const parsed = JSON.parse(linesKey) as [number | null, number][];
      const result = await quote_order_shipping_action({
        order_id: orderId ?? null,
        warehouse_id: warehouseId && warehouseId !== "none" ? Number(warehouseId) : null,
        country_id: Number(countryId),
        state_id: Number(stateId),
        city_id: Number(cityId),
        lines: parsed.filter(([, qty]) => qty > 0).map(([sku_id, quantity]) => ({ sku_id, quantity })),
        subtotal,
      });
      if (cancelled) return;
      setLoading(false);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setQuote(result.data);
      const cheapest = result.data.options[0];
      if (cheapest && applyRef.current.autoApply) applyRef.current.onApply(cheapest);
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ready, orderId, countryId, stateId, cityId, warehouseId, subtotal, linesKey]);

  if (!ready) {
    return <p className='col-span-12 text-xs text-muted-foreground'>{t("needCity")}</p>;
  }

  return (
    <div className='col-span-12 grid gap-2' aria-live='polite' aria-busy={loading}>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <p className='text-sm font-medium text-foreground'>{t("title")}</p>
        {quote ? <p className='text-xs text-muted-foreground'>{t("zone", { zone: zoneLabel(quote.zone_key, quote.zone_name) })}</p> : null}
      </div>
      {error ? <p role='alert' className='text-sm text-destructive'>{error}</p> : null}
      {loading && !quote ? <p className='text-xs text-muted-foreground'>{t("loading")}</p> : null}
      {quote && quote.options.length === 0 ? (
        <p className='rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm'>
          {t("noCoverage")}{" "}
          <Link href='/logistica/shipping-costs' className='font-medium text-primary underline-offset-4 hover:underline'>{t("goToTariff")}</Link>
        </p>
      ) : null}
      {quote && quote.options.length > 0 ? (
        <ShippingOptionsList
          options={quote.options}
          selectedCardId={quote.options.find((o) => String(o.carrier_id) === carrierId)?.rate_card_id ?? null}
          onSelect={editable ? onApply : undefined}
          disabled={!editable}
        />
      ) : null}
      {quote && quote.options.length > 0 ? <p className='text-xs text-muted-foreground'>{t("hint")}</p> : null}
    </div>
  );
};
