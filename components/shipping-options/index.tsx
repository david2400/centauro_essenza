/** @format */

"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import { Buttons } from "@repo/ui/buttons/scenes";
import { HiCheckCircle, HiOutlineTruck } from "react-icons/hi2";
import { cn } from "@repo/ui/utils";
import { formatLocalDate, formatMoney, formatNumber } from "@/lib/format";
import type { ShippingOptionDto } from "@/server/domains/shipping_logistics/tariffs/types";

const ROUTES = ["LOCAL", "REGIONAL", "NATIONAL"];

/** Nombre de la zona: trayecto automático (local, regional, nacional) o zona propia. */
export const useZoneLabel = () => {
  const t = useTranslations("Administre.shippingOptions");
  return (zoneKey: string, zoneName?: string | null) => (ROUTES.includes(zoneKey) ? t(`zones.${zoneKey}`) : zoneName || zoneKey);
};

interface ShippingOptionsListProps {
  options: ShippingOptionDto[];
  /** Tarifario elegido (resalta la fila). */
  selectedCardId?: number | null;
  onSelect?: (option: ShippingOptionDto) => void;
  disabled?: boolean;
}

/**
 * Opciones de envío por transportadora, de la más económica a la más cara: valor (o gratis), plazo en días hábiles,
 * fecha máxima de entrega y peso cobrable. Compartido por el simulador, la orden y el despacho.
 */
export const ShippingOptionsList = ({ options, selectedCardId, onSelect, disabled }: ShippingOptionsListProps) => {
  const t = useTranslations("Administre.shippingOptions");
  const zoneLabel = useZoneLabel();

  return (
    <ul className='grid gap-2' aria-label={t("listLabel")}>
      {options.map((option, index) => {
        const selected = selectedCardId != null && selectedCardId === option.rate_card_id;
        const days = option.min_days === option.max_days ? t("days", { days: option.max_days }) : t("daysRange", { min: option.min_days, max: option.max_days });
        return (
          <li
            key={option.rate_card_id}
            className={cn(
              "flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm transition-colors",
              selected && "border-primary/50 bg-primary/5",
            )}>
            <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground'>
              <HiOutlineTruck className='h-5 w-5' aria-hidden='true' />
            </span>
            <div className='min-w-0 flex-1'>
              <p className='flex flex-wrap items-center gap-2 font-medium text-foreground'>
                {option.carrier_name ?? `#${option.carrier_id}`}
                {index === 0 ? <Badge variant='secondary'>{t("cheapest")}</Badge> : null}
                <Badge variant='outline'>{zoneLabel(option.zone_key, option.zone_name)}</Badge>
              </p>
              <p className='text-xs text-muted-foreground'>
                {days} · {t("deliveryBy", { date: formatLocalDate(option.delivery_to) })}
              </p>
              <p className='text-xs text-muted-foreground'>
                {t("chargeable", { kg: formatNumber(option.chargeable_kg) })}
                {option.weight_estimated ? (
                  <span className='ml-2 text-amber-700 dark:text-amber-400' title={t("estimatedHint")}>
                    {t("estimated")}
                  </span>
                ) : null}
              </p>
            </div>
            <div className='text-right'>
              <p className='text-base font-semibold tabular-nums text-foreground'>{option.free ? t("free") : formatMoney(option.total)}</p>
              <p className='text-xs text-muted-foreground tabular-nums'>
                {t("breakdown", { freight: formatMoney(option.freight), insurance: formatMoney(option.insurance) })}
              </p>
            </div>
            {onSelect ? (
              <Buttons
                type='button'
                variant={selected ? "default" : "outline"}
                size='sm'
                disabled={disabled}
                aria-pressed={selected}
                className='rounded-full'
                onClick={() => onSelect(option)}>
                {selected ? (
                  <>
                    <HiCheckCircle className='mr-1 h-4 w-4' aria-hidden='true' />
                    {t("selected")}
                  </>
                ) : (
                  t("use")
                )}
              </Buttons>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
};
