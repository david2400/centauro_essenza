/** @format */

import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { get_warehouse } from "@/server/domains/inventory/warehouses/queries";
import { ServerApiError } from "@/server/lib/types";
import { WarehouseEditor } from "@/modules/inventory/warehouse";

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Administre.warehouse" });
  return { title: t("editTitle") };
}

const EditWarehousePage = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const warehouseId = Number(id);
  if (!Number.isInteger(warehouseId) || warehouseId <= 0) notFound();
  try {
    return <WarehouseEditor warehouse={await get_warehouse({ id: warehouseId })} />;
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ServerApiError && error.status === 404) notFound();
    throw error;
  }
};

export default EditWarehousePage;
