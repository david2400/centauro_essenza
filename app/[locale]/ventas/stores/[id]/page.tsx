/** @format */

import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { list_stores } from "@/server/domains/sales/cash/queries";
import { list_all_warehouses } from "@/server/domains/inventory/warehouses/queries";
import { StoreEditor } from "@/modules/ventas/cash";

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  return { title: t("stores") };
}

const EditStorePage = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const storeId = Number(id);
  const [stores, warehouses] = await Promise.all([list_stores(true), list_all_warehouses().catch((error) => { unstable_rethrow(error); return []; })]);
  const store = stores.find((item) => item.id === storeId);
  if (!store) notFound();
  return <StoreEditor store={store} warehouses={warehouses
    // Solo bodegas activas que venden (V14); se conserva la actual de la tienda aunque ya no cumpla.
    .filter((w) => (w.active !== false && w.allow_sales !== false) || w.id === store.warehouse_id)
    .map(({ id: warehouseId, name }) => ({ id: warehouseId, name }))} />;
};

export default EditStorePage;
