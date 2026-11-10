/** @format */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Buttons } from "@repo/ui/buttons/scenes";
import { HiOutlineArrowPath } from "react-icons/hi2";
import { ShippingOptionsList, useZoneLabel } from "@/components/shipping-options";
import { formatMoney } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import { quote_order_shipping_action } from "@/server/domains/shipping_logistics/tariffs/actions";
import type { ShippingQuoteDto } from "@/server/domains/shipping_logistics/tariffs/types";
import type { IDispatchShipment } from "../models/dispatch.interface";

/**
 * Cotización del despacho con el tarifario, sin escribir nada: toma destino, bodega, subtotal y líneas de la orden.
 * Muestra la transportadora y el valor que quedaron en la orden para comparar.
 */
export const ShippingQuote = ({ shipment }: { shipment: IDispatchShipment | null }) => {
  const t = useTranslations("Administre.dispatch.quote");
  const zoneLabel = useZoneLabel();
  const [quote, setQuote] = useState<ShippingQuoteDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const ready = Boolean(shipment?.country_id && shipment.state_id && shipment.city_id);

  const run = useCallback(async () => {
    if (!shipment || !shipment.country_id || !shipment.state_id || !shipment.city_id) return;
    setLoading(true);
    setError(null);
    const result = await quote_order_shipping_action({
      order_id: shipment.order_id ?? null,
      warehouse_id: shipment.warehouse_id ?? null,
      country_id: shipment.country_id,
      state_id: shipment.state_id,
      city_id: shipment.city_id,
      destination_label: shipment.destination_label ?? null,
      lines: shipment.lines,
      subtotal: shipment.subtotal ?? null,
    });
    setLoading(false);
    if (result.success) setQuote(result.data);
    else setError(result.error);
  }, [shipment]);

  useEffect(() => {
    void run();
  }, [run]);

  return (
    <div className='space-y-4 rounded-xl border border-border/70 bg-background/60 p-5'>
      <div className='flex flex-wrap items-start justify-between gap-2'>
        <div>
          <h3 className='text-base font-semibold text-foreground'>{t("title")}</h3>
          <p className='mt-1 text-sm text-muted-foreground'>{t("description")}</p>
        </div>
        {ready ? (
          <Buttons type='button' variant='outline' size='sm' className='rounded-full' loading={loading} onClick={() => void run()}>
            <HiOutlineArrowPath className='mr-1 h-4 w-4' aria-hidden='true' />
            {t("refresh")}
          </Buttons>
        ) : null}
      </div>

      {!shipment ? (
        <p className='text-sm text-muted-foreground'>{t("noOrder")}</p>
      ) : !ready ? (
        <p className='rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm'>
          {t("noDestination")}{" "}
          {shipment.order_id ? (
            <Link href={`/ventas/orders/${shipment.order_id}`} className='font-medium text-primary underline-offset-4 hover:underline'>
              {t("editOrder")}
            </Link>
          ) : null}
        </p>
      ) : (
        <div aria-live='polite' className='space-y-3'>
          {shipment.destination_label ? <p className='text-sm text-muted-foreground'>{t("destination", { place: shipment.destination_label })}</p> : null}
          {shipment.shipping_amount != null ? (
            <p className='text-sm text-muted-foreground'>{t("charged", { amount: formatMoney(shipment.shipping_amount) })}</p>
          ) : null}
          {error ? <p role='alert' className='text-sm text-destructive'>{error}</p> : null}
          {quote ? (
            quote.options.length === 0 ? (
              <p className='rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm'>
                {t("noCoverage", { zone: zoneLabel(quote.zone_key, quote.zone_name) })}{" "}
                <Link href='/logistica/shipping-costs' className='font-medium text-primary underline-offset-4 hover:underline'>{t("goToTariff")}</Link>
              </p>
            ) : (
              <ShippingOptionsList options={quote.options} selectedCardId={null} />
            )
          ) : loading ? (
            <p className='text-sm text-muted-foreground'>{t("loading")}</p>
          ) : null}
        </div>
      )}
    </div>
  );
};
