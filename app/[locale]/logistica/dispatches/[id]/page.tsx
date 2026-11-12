/** @format */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { get_dispatch_product_by_id } from "@/server/domains/shipping_logistics/dispatch/dispatch-products/queries";
import {
  list_dispatch_details_of_dispatch,
  list_trackings_of_dispatch,
} from "@/server/domains/shipping_logistics/product_distribution/shipping-logistics/queries";
import { list_orders } from "@/server/domains/sales/orders/queries";
import { list_order_items } from "@/server/domains/sales/product-orders/queries";
import { lookup_products } from "@/server/domains/lookups/queries";
import { ServerApiError } from "@/server/lib/types";
import { DispatchDetail, type IDispatchShipment } from "@/modules/logistica/dispatch";

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "Administre.dispatch" });
  return { title: t("dispatchLabel", { guide: `#${id}` }) };
}

/**
 * Nombre de cada línea: el snapshot de la línea (F5) o, en líneas antiguas sin él,
 * el producto resuelto por id (solo esos ids, no el catálogo entero).
 */
async function line_names(items: Array<{ product_id?: number; product_name?: string }>) {
  const missing = [
    ...new Set(items.filter((item) => !item.product_name && item.product_id != null).map((item) => item.product_id as number)),
  ];
  const found = missing.length > 0 ? await lookup_products({ ids: missing }) : [];
  const names = new Map(found.map((product) => [product.id, product.name]));
  return (item: { product_id?: number; product_name?: string }) =>
    item.product_name ?? names.get(item.product_id) ?? `#${item.product_id}`;
}

/** Datos del envío tomados de la orden del despacho (para cotizar con el tarifario sin escribir nada). */
function shipmentOf(
  order: Awaited<ReturnType<typeof list_orders>>[number] | undefined,
  items: Awaited<ReturnType<typeof list_order_items>>,
): IDispatchShipment | null {
  if (!order) return null;
  return {
    order_id: order.id,
    country_id: order.ship_country_id ?? null,
    state_id: order.ship_state_id ?? null,
    city_id: order.ship_city_id ?? null,
    destination_label: [order.ship_city, order.ship_state].filter(Boolean).join(", ") || null,
    warehouse_id: order.warehouse_id ?? null,
    subtotal: order.items_subtotal ?? null,
    carrier_id: order.carrier_id ?? null,
    shipping_amount: order.shipping_amount ?? null,
    lines: items
      .filter((item) => (item.quantity ?? 0) > 0)
      .map((item) => ({ sku_id: item.sku_id ?? null, product_id: item.product_id ?? null, quantity: item.quantity ?? 0 })),
  };
}

const DispatchDetailPage = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const dispatchId = Number(id);
  if (!Number.isInteger(dispatchId) || dispatchId <= 0) notFound();

  const dispatch = await get_dispatch_product_by_id({ id: dispatchId }).catch((error: unknown) => {
    if (error instanceof ServerApiError && error.is_not_found) notFound();
    throw error;
  });

  const [lines, trackings, orders, productOrders] = await Promise.all([
    list_dispatch_details_of_dispatch(dispatchId),
    list_trackings_of_dispatch(dispatchId),
    list_orders(),
    dispatch.order_id != null ? list_order_items(dispatch.order_id) : Promise.resolve([]),
  ]);

  const orderItems = productOrders.filter((item) => item.order_id === dispatch.order_id);
  const nameOf = await line_names(orderItems);

  return (
    <DispatchDetail
      dispatch={dispatch}
      lines={lines.filter((line) => line.dispatch_product_id === dispatchId)}
      trackings={trackings.filter((tracking) => tracking.dispatch_product_id === dispatchId)}
      orderLines={orderItems
        .map((item) => ({
          id: item.id,
          product_name: nameOf(item),
          quantity: item.quantity ?? 0,
        }))}
      shipment={shipmentOf(orders.find((order) => order.id === dispatch.order_id), orderItems)}
      orders={orders.map((order) => ({
        id: order.id,
        name: `#${order.id}${order.state ? ` · ${order.state}` : ""}`,
      }))}
    />
  );
};

export default DispatchDetailPage;
