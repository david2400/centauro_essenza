/** @format */

import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { get_order_by_id, get_order_reservations, get_order_timeline } from "@/server/domains/sales/orders/queries";
import { list_carriers } from "@/server/domains/shipping_logistics/product_distribution/carriers/queries";
import { list_product_orders } from "@/server/domains/sales/product-orders/queries";
import { list_all_warehouses } from "@/server/domains/inventory/warehouses/queries";
import { get_order_payments } from "@/server/domains/sales/payments/queries";
import { list_payment_methods } from "@/server/domains/sales/payment-methods/queries";
import { ServerApiError } from "@/server/lib/types";
import { OrderDetail } from "@/modules/ventas/order";
import { OrderPurchaseNotice } from "@/modules/ventas/purchase";
import { purchases_repository } from "@/server/domains/sales/purchases/repository";
import { customers_repository } from "@/server/domains/sales/customers/repository";
import { consignment_repository } from "@/server/domains/marketplace/consignment/repository";
import { OrderConsignmentNotice, OrderDisputeNotice } from "@/modules/marketplace";
import { disputes_repository } from "@/server/domains/marketplace/disputes/repository";
import { get_marketplace_access } from "@/server/domains/marketplace/access";
import { OrderPayments } from "@/modules/ventas/payment";
import { get_order_invoices } from "@/server/domains/billing/invoices/queries";
import { get_billing_settings } from "@/server/domains/billing/settings/queries";
import { OrderInvoices } from "@/modules/facturacion/invoice";
import { list_order_devolutions } from "@/server/domains/devolution/order-devolutions/queries";
import { OrderReturns } from "@/modules/postventa/devolution";
import { load_devolution_catalogs } from "../../../postventa/devolutions/catalogs";

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "Administre.order" });
  const order = await get_order_by_id({ id: Number(id) }).catch((error) => { unstable_rethrow(error); return null; });
  return { title: order?.order_number ?? t("orderLabel", { id }) };
}

const OrderDetailPage = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId <= 0) notFound();

  const order = await get_order_by_id({ id: orderId }).catch((error: unknown) => {
    if (error instanceof ServerApiError && error.is_not_found) notFound();
    throw error;
  });

  // Las líneas eligen el SKU con el buscador asíncrono (/catalog/skus/lookup): ya no se cargan productos aquí.
  // Los pagos son un bloque aparte: si su API falla, el detalle funciona igual.
  const [items, reservations, warehouses, payments, methods, invoices, billing, devolutions, returnCatalogs, events, carriers, purchase, customerLink, consigned, dispute, marketplaceAccess] = await Promise.all([
    list_product_orders(),
    get_order_reservations({ id: orderId }).catch((error) => { unstable_rethrow(error); return []; }),
    list_all_warehouses(),
    get_order_payments({ order_id: orderId }).catch((error) => { unstable_rethrow(error); return null; }),
    list_payment_methods(false).catch((error) => { unstable_rethrow(error); return []; }),
    get_order_invoices({ order_id: orderId }).catch((error) => { unstable_rethrow(error); return null; }),
    get_billing_settings().catch((error) => { unstable_rethrow(error); return null; }),
    list_order_devolutions().catch((error) => { unstable_rethrow(error); return []; }),
    load_devolution_catalogs().catch(() => ({ motives: [], returnMethods: [], refundMethods: [] })),
    get_order_timeline(orderId).catch((error) => { unstable_rethrow(error); return []; }),
    list_carriers().catch((error) => { unstable_rethrow(error); return []; }),
    // Compra multivendedor a la que pertenece (404 = orden independiente).
    purchases_repository.of_order(orderId).catch((error) => { unstable_rethrow(error); return null; }),
    // Ficha del cliente con el documento de la orden (si falla, la tarjeta del cliente queda sin enlace).
    order.customer_doc_number
      ? customers_repository.by_document(order.customer_doc_type, order.customer_doc_number).catch((error) => { unstable_rethrow(error); return undefined; })
      : Promise.resolve(undefined),
    // Subpedido externo: de qué bodega salió lo vendido desde consignación (sin permiso o sin datos, no se muestra).
    order.third_party_sale
      ? consignment_repository.movements({ q: "", page: 0, size: 50, sort: null, filters: { orderId: String(orderId) } })
          .then((page) => page.items).catch((error) => { unstable_rethrow(error); return []; })
      : Promise.resolve([]),
    // Reclamo del comprador contra el vendedor externo (sin permiso o sin datos, no se muestra).
    order.third_party_sale
      ? disputes_repository.of_order(orderId).catch((error) => { unstable_rethrow(error); return null; })
      : Promise.resolve(null),
    order.third_party_sale ? get_marketplace_access() : Promise.resolve(null),
  ]);
  const canOpenDispute = Boolean(marketplaceAccess?.disputesManage);

  return (
    <OrderDetail
      order={order}
      items={items.filter((item) => item.order_id === orderId)}
      reservations={reservations}
      warehouses={warehouses.map(({ id: warehouseId, name }) => ({ id: warehouseId, name }))}
      carriers={carriers.filter((carrier) => carrier.is_active !== false).map(({ id: carrierId, name }) => ({ id: carrierId, name }))}
      events={events}
      notice={purchase || consigned.length > 0 || dispute || canOpenDispute ? (
        <>
          {purchase ? <OrderPurchaseNotice link={purchase} /> : null}
          {consigned.length > 0 ? <OrderConsignmentNotice orderId={orderId} movements={consigned} /> : null}
          {order.third_party_sale ? <OrderDisputeNotice orderId={orderId} dispute={dispute} canOpen={canOpenDispute} /> : null}
        </>
      ) : undefined}
      customerProfileId={customerLink === undefined ? undefined : customerLink.id}
      payments={<OrderPayments key='order-payments' data={payments} methods={methods} thirdParty={payments ? Boolean(payments.seller_collects) : Boolean(order.third_party_sale)} />}
      invoices={
        <OrderInvoices
          key='order-invoices'
          orderId={orderId}
          orderState={order.state}
          orderTotal={order.total}
          invoices={invoices}
          settings={billing}
        />
      }
      returns={
        <OrderReturns
          key='order-returns'
          orderId={orderId}
          orderState={order.state}
          devolutions={devolutions.filter((devolution) => devolution.order_id === orderId)}
          catalogs={returnCatalogs}
        />
      }
    />
  );
};

export default OrderDetailPage;
