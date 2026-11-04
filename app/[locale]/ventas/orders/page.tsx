/** @format */

import { unstable_rethrow } from 'next/navigation';
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { get_order_summary } from "@/server/domains/sales/orders/queries";
import { search_orders } from "@/server/domains/sales/orders/search";
import { list_stores } from "@/server/domains/sales/cash/queries";
import { parse_grid_query } from "@/server/lib/pagination";
import { ORDER_GRID } from "./grid";
import { OrderManager } from "@/modules/ventas/order";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  const tModule = await getTranslations({ locale, namespace: "Administre.order" });

  return { title: t("order"), description: tModule("description") };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const OrdersPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const query = parse_grid_query(await searchParams, ORDER_GRID);
  // Los KPIs usan los mismos filtros que la tabla.
  const [page, summary, stores] = await Promise.all([
    search_orders(query),
    get_order_summary({ q: query.q || undefined, ...query.filters }).catch((error) => { unstable_rethrow(error); return null; }),
    list_stores(true).catch((error) => { unstable_rethrow(error); return []; }),
  ]);

  return <OrderManager page={page} summary={summary} stores={stores.map(({ id, name }) => ({ id, name }))} />;
};

export default OrdersPage;
