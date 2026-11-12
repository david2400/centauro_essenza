/** @format */

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { list_dispatch_products } from "@/server/domains/shipping_logistics/dispatch/dispatch-products/queries";
import { search_dispatch_products } from "@/server/domains/shipping_logistics/dispatch/dispatch-products/search";
import { parse_grid_query } from "@/server/lib/pagination";
import { DISPATCH_GRID } from "./grid";
import { list_orders } from "@/server/domains/sales/orders/queries";
import { DispatchManager } from "@/modules/logistica/dispatch";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  const tModule = await getTranslations({ locale, namespace: "Administre.dispatch" });

  return { title: t("dispatch"), description: tModule("description") };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const DispatchesPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const query = parse_grid_query(await searchParams, DISPATCH_GRID);
  const [page, all, orders] = await Promise.all([search_dispatch_products(query), list_dispatch_products(), list_orders()]);

  return (
    <DispatchManager
      page={page}
      // Solo los campos de KPIs y filtro: no viaja al navegador la tabla completa.
      all={all.map(({ estimated_delivery_date, city_destination }) => ({ estimated_delivery_date, city_destination }))}
      orders={orders.map((order) => ({
        id: order.id,
        name: `#${order.id}${order.state ? ` · ${order.state}` : ""}`,
      }))}
    />
  );
};

export default DispatchesPage;
