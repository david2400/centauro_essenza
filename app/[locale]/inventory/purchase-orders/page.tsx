/** @format */

import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { purchase_orders_repository } from "@/server/domains/inventory/purchase-orders/repository";
import { parse_grid_query } from "@/server/lib/pagination";
import { PurchaseOrderManager } from "@/modules/inventory/purchase-order";
import { PURCHASE_ORDER_GRID } from "./grid";
import { purchase_access } from "./access";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  const tModule = await getTranslations({ locale, namespace: "Administre.purchaseOrder" });
  return { title: t("purchaseOrders"), description: tModule("description") };
}

const PurchaseOrdersPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const query = parse_grid_query(await searchParams, PURCHASE_ORDER_GRID);
  const [page, stats, access] = await Promise.all([
    purchase_orders_repository.search(query),
    purchase_orders_repository.stats().catch((error) => { unstable_rethrow(error); return null; }),
    purchase_access(),
  ]);
  return <PurchaseOrderManager page={page} stats={stats} canManage={access.manage} />;
};

export default PurchaseOrdersPage;
