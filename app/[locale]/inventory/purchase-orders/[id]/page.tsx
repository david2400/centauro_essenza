/** @format */

import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { purchase_orders_repository } from "@/server/domains/inventory/purchase-orders/repository";
import { ServerApiError } from "@/server/lib/types";
import { PurchaseOrderDetail } from "@/modules/inventory/purchase-order";

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  return { title: t("purchaseOrders") };
}

const PurchaseOrderPage = async ({ params }: { params: Params }) => {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  try {
    return <PurchaseOrderDetail order={await purchase_orders_repository.get(id)} />;
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ServerApiError && error.status === 404) notFound();
    throw error;
  }
};

export default PurchaseOrderPage;
