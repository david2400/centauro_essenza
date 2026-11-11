/** @format */

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { list_stores } from "@/server/domains/sales/cash/queries";
import { list_all_warehouses } from "@/server/domains/inventory/warehouses/queries";
import { StoreManager } from "@/modules/ventas/cash";
import { with_fallback } from '@/server/lib/fallback';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  const tModule = await getTranslations({ locale, namespace: "Administre.cash.store" });
  return { title: t("stores"), description: tModule("description") };
}

const StoresPage = async () => {
  const [stores, warehouses] = await Promise.all([list_stores(true), with_fallback(list_all_warehouses(), [])]);
  return <StoreManager stores={stores} warehouses={warehouses.map(({ id, name }) => ({ id, name }))} />;
};

export default StoresPage;
