/** @format */

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import { Buttons } from "@repo/ui/buttons/scenes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/tabs/scenes/tabs";
import { HiOutlineTruck } from "react-icons/hi2";
import { PageHeader } from "@/components/page-header";
import { notify } from "@/components/notifications";
import { useZoneLabel } from "@/components/shipping-options";
import { formatApiDate, formatMoney, formatNumber } from "@/lib/format";
import { dismiss_coverage_gap_action } from "@/server/domains/shipping_logistics/tariffs/actions";
import type { CoverageGapDto, RateCardDto, TariffZoneDto } from "@/server/domains/shipping_logistics/tariffs/types";
import type { ShippingCostDto } from "@/server/domains/shipping_logistics/product_distribution/shipping-costs/types";
import { RateCards, type TariffCarrier } from "./rate-cards";
import { Simulator, type TariffWarehouse } from "./simulator";
import { ZonesPanel } from "./zones-panel";

interface TariffManagerProps {
  cards: RateCardDto[];
  zones: TariffZoneDto[];
  gaps: CoverageGapDto[];
  carriers: TariffCarrier[];
  warehouses: TariffWarehouse[];
  history: ShippingCostDto[];
}

/**
 * Tarifario de envíos: lo usan la orden, el despacho y la tienda en línea para cotizar con el destino del catálogo de
 * parametros, la bodega de origen y el peso cobrable de los productos.
 */
export const TariffManager = ({ cards: initialCards, zones: initialZones, gaps: initialGaps, carriers, warehouses, history }: TariffManagerProps) => {
  const t = useTranslations("Administre.tariffs");
  const tCommon = useTranslations("Administre.common");
  const zoneLabel = useZoneLabel();
  const [cards, setCards] = useState(initialCards);
  const [zones, setZones] = useState(initialZones);
  const [gaps, setGaps] = useState(initialGaps);
  const carrierName = (id?: number) => carriers.find((c) => c.id === id)?.name ?? (id != null ? `#${id}` : "—");

  const dismiss = async (gap: CoverageGapDto) => {
    const result = await dismiss_coverage_gap_action(gap.country_id, gap.state_id, gap.city_id);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    setGaps((list) => list.filter((g) => g !== gap));
  };

  return (
    <section className='flex w-full flex-col gap-6'>
      <PageHeader title={t("title")} description={t("description")} icon={HiOutlineTruck} eyebrow={t("eyebrow")} />
      <Tabs defaultValue='cards' className='w-full'>
        <TabsList className='h-auto max-w-full justify-start overflow-x-auto'>
          <TabsTrigger className='flex-none whitespace-nowrap px-4' value='cards'>{t("tabs.cards", { count: cards.length })}</TabsTrigger>
          <TabsTrigger className='flex-none whitespace-nowrap px-4' value='zones'>{t("tabs.zones", { count: zones.length })}</TabsTrigger>
          <TabsTrigger className='flex-none whitespace-nowrap px-4' value='simulator'>{t("tabs.simulator")}</TabsTrigger>
          <TabsTrigger className='flex-none whitespace-nowrap px-4' value='gaps'>
            {t("tabs.gaps")}
            {gaps.length > 0 ? <Badge variant='destructive' className='ml-2'>{gaps.length}</Badge> : null}
          </TabsTrigger>
          <TabsTrigger className='flex-none whitespace-nowrap px-4' value='history'>{t("tabs.history")}</TabsTrigger>
        </TabsList>

        <TabsContent value='cards' className='mt-4'>
          <RateCards cards={cards} zones={zones} carriers={carriers} onChange={setCards} />
        </TabsContent>

        <TabsContent value='zones' className='mt-4'>
          <ZonesPanel zones={zones} onChange={setZones} />
        </TabsContent>

        <TabsContent value='simulator' className='mt-4'>
          <Simulator warehouses={warehouses} />
        </TabsContent>

        <TabsContent value='gaps' className='mt-4'>
          <p className='mb-3 text-sm text-muted-foreground'>{t("gaps.intro")}</p>
          {gaps.length === 0 ? (
            <p className='rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground'>{t("gaps.empty")}</p>
          ) : (
            <div className='overflow-x-auto rounded-xl border border-border'>
              <table className='w-full text-sm'>
                <thead className='bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground'>
                  <tr>
                    <th className='px-4 py-2'>{t("gaps.destination")}</th>
                    <th className='px-4 py-2'>{t("gaps.zone")}</th>
                    <th className='px-4 py-2 text-right'>{t("gaps.misses")}</th>
                    <th className='px-4 py-2'>{t("gaps.last")}</th>
                    <th className='px-4 py-2' />
                  </tr>
                </thead>
                <tbody className='divide-y divide-border'>
                  {gaps.map((gap) => (
                    <tr key={`${gap.country_id}:${gap.state_id}:${gap.city_id}`}>
                      <td className='px-4 py-2 font-medium'>{gap.label ?? `${gap.state_id} / ${gap.city_id}`}</td>
                      <td className='px-4 py-2'>{gap.zone_key ? zoneLabel(gap.zone_key, zones.find((z) => z.zone_key === gap.zone_key)?.name) : "—"}</td>
                      <td className='px-4 py-2 text-right tabular-nums'>{formatNumber(gap.misses)}</td>
                      <td className='px-4 py-2'>{formatApiDate(gap.last_at)}</td>
                      <td className='px-4 py-2 text-right'>
                        <Buttons type='button' variant='outline' size='sm' className='rounded-full' onClick={() => void dismiss(gap)}>
                          {t("gaps.dismiss")}
                        </Buttons>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value='history' className='mt-4'>
          <p className='mb-3 text-sm text-muted-foreground'>{t("history.intro")}</p>
          {history.length === 0 ? (
            <p className='text-sm text-muted-foreground'>{t("history.empty")}</p>
          ) : (
            <div className='overflow-x-auto rounded-xl border border-border'>
              <table className='w-full text-sm'>
                <thead className='bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground'>
                  <tr>
                    <th className='px-4 py-2'>{t("history.carrier")}</th>
                    <th className='px-4 py-2'>{t("history.route")}</th>
                    <th className='px-4 py-2 text-right'>{t("history.weight")}</th>
                    <th className='px-4 py-2 text-right'>{t("history.cost")}</th>
                    <th className='px-4 py-2'>{t("history.method")}</th>
                    <th className='px-4 py-2'>{t("history.date")}</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-border'>
                  {history.map((row) => (
                    <tr key={row.id}>
                      <td className='px-4 py-2'>{carrierName(row.carrier_id)}</td>
                      <td className='px-4 py-2 text-xs'>{row.origin_address} → {row.destination_address}</td>
                      <td className='px-4 py-2 text-right tabular-nums'>{row.weight != null ? `${formatNumber(row.weight)} kg` : "—"}</td>
                      <td className='px-4 py-2 text-right tabular-nums'>{formatMoney(row.calculated_cost)}</td>
                      <td className='px-4 py-2 text-xs text-muted-foreground'>{row.calculation_method ?? "—"}</td>
                      <td className='px-4 py-2 text-xs'>{formatApiDate(row.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
};
