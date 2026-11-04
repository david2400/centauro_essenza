/** @format */

import { unstable_rethrow } from 'next/navigation';
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { list_all_warehouses } from "@/server/domains/inventory/warehouses/queries";
import { StoreEditor } from "@/modules/ventas/cash";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Administre.cash.store" });
  return { title: t("createTitle") };
}

const NewStorePage = async () => {
  const warehouses = await list_all_warehouses().catch((error) => { unstable_rethrow(error); return []; });
  return <StoreEditor warehouses={warehouses.filter((w) => w.active !== false && w.allow_sales !== false).map(({ id, name }) => ({ id, name }))} />;
};

export default NewStorePage;
