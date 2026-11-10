/** @format */

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { list_carriers } from "@/server/domains/shipping_logistics/product_distribution/carriers/queries";
import { list_shipping_costs } from "@/server/domains/shipping_logistics/product_distribution/shipping-costs/queries";
import { list_coverage_gaps, list_rate_cards, list_tariff_zones } from "@/server/domains/shipping_logistics/tariffs/queries";
import { list_all_warehouses } from "@/server/domains/inventory/warehouses/queries";
import { TariffManager } from "@/modules/logistica/tariff";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Administre.tariffs" });
  return { title: t("title"), description: t("description") };
}

/** Tarifario de envíos (antes "Costos de envío"): el historial de cálculos viejos queda de solo lectura. */
const ShippingTariffPage = async () => {
  const [cards, zones, gaps, carriers, warehouses, history] = await Promise.all([
    list_rate_cards(),
    list_tariff_zones(),
    list_coverage_gaps(),
    list_carriers(),
    list_all_warehouses(),
    list_shipping_costs().catch(() => []),
  ]);

  return (
    <TariffManager
      cards={cards}
      zones={zones}
      gaps={gaps}
      carriers={carriers.filter((c) => c.is_active !== false && c.id != null).map((c) => ({ id: c.id!, name: c.name ?? `#${c.id}` }))}
      warehouses={warehouses.filter((w) => w.id != null && w.active !== false).map((w) => ({ id: w.id!, name: w.name ?? `#${w.id}`, is_main: w.is_main }))}
      history={history}
    />
  );
};

export default ShippingTariffPage;
