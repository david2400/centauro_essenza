/** @format */

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { purchase_orders_repository } from "@/server/domains/inventory/purchase-orders/repository";
import { PurchaseSuggestions } from "@/modules/inventory/purchase-order";
import { purchase_access } from "../access";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Administre.purchaseOrder.suggestions" });
  return { title: t("title"), description: t("description") };
}

const PurchaseSuggestionsPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const raw = Number((await searchParams).warehouseId);
  const warehouseId = Number.isInteger(raw) && raw > 0 ? raw : null;
  const [data, options, access] = await Promise.all([
    purchase_orders_repository.suggestions(warehouseId),
    purchase_orders_repository.options(),
    purchase_access(),
  ]);
  return <PurchaseSuggestions data={data} options={options} warehouseId={warehouseId} canManage={access.manage} />;
};

export default PurchaseSuggestionsPage;
