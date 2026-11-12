/** @format */

import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { get_order_by_id } from "@/server/domains/sales/orders/queries";
import { list_order_items } from "@/server/domains/sales/product-orders/queries";
import { get_billing_settings } from "@/server/domains/billing/settings/queries";
import { ServerApiError } from "@/server/lib/types";
import { OrderPrint } from "@/modules/ventas/order";

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "Administre.order.print" });
  return { title: t("title", { id }) };
}

const OrderPrintPage = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId <= 0) notFound();
  const [order, items, issuer] = await Promise.all([
    get_order_by_id({ id: orderId }).catch((error: unknown) => {
      if (error instanceof ServerApiError && error.is_not_found) notFound();
      throw error;
    }),
    list_order_items(orderId),
    get_billing_settings().catch((error) => { unstable_rethrow(error); return null; }),
  ]);
  return <OrderPrint order={order} items={items.filter((item) => item.order_id === orderId)} issuer={issuer} />;
};

export default OrderPrintPage;
