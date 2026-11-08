/** @format */

import type { AlertDto, AlertItemDto } from "@/server/domains/operations/types";

export type { AlertDto as IAlert, AlertItemDto as IAlertItem, AlertsDto as IAlerts } from "@/server/domains/operations/types";

/** A dónde lleva cada alerta (listado filtrado) y cada ejemplo (su ficha). */
export const ALERT_HREF: Record<string, string> = {
  DISPATCH_OVERDUE: "/ventas/dispatch?view=OVERDUE",
  DISPATCH_DUE_TODAY: "/ventas/dispatch?view=DUE_TODAY",
  DISPATCH_WITHOUT_DATE: "/ventas/dispatch",
  COMMISSIONS_IN_REVIEW: "/marketplace/billing?status=REVIEW",
  DISPUTES_OVERDUE: "/marketplace/disputes?status=OVERDUE",
  DISPUTES_TO_DECIDE: "/marketplace/disputes?status=SELLER_RESPONDED",
  SELLERS_OVERDUE: "/marketplace/sellers",
  SELLERS_PAYABLE: "/marketplace/sellers",
  OFFERS_IN_REVIEW: "/marketplace/offers?status=PENDING_REVIEW",
  SELLERS_IN_REVIEW: "/marketplace/sellers?status=IN_REVIEW",
  CONSIGNMENT_WITHOUT_OFFER: "/marketplace/consignment",
  CONSIGNMENT_AGED: "/marketplace/consignment",
  INVOICES_REJECTED: "/facturacion/invoices?status=REJECTED",
  INVOICES_PENDING: "/facturacion/invoices?status=PENDING",
  RETURNS_STALLED: "/postventa/devolutions",
  PURCHASES_OVERDUE: "/inventory/purchase-orders?status=OVERDUE",
  LOW_STOCK: "/inventory/warehouses",
};

export const itemHref = (alert: AlertDto, item: AlertItemDto): string | null => {
  if (item.ref_id == null) return null;
  switch (item.ref_type) {
    case "ORDER": return `/ventas/orders/${item.ref_id}`;
    case "SELLER": return `/marketplace/sellers/${item.ref_id}`;
    case "INVOICE": return `/facturacion/invoices/${item.ref_id}`;
    case "RETURN": return `/postventa/devolutions/${item.ref_id}`;
    case "OFFER": return `/marketplace/offers/${item.ref_id}`;
    case "WAREHOUSE": return `/inventory/warehouses/${item.ref_id}`;
    case "DISPUTE": return `/marketplace/disputes/${item.ref_id}`;
    case "PURCHASE_ORDER": return `/inventory/purchase-orders/${item.ref_id}`;
    default: return ALERT_HREF[alert.key] ?? null;
  }
};

/** Alertas cuyo monto es dinero (las demás muestran unidades o nada). */
export const MONEY_ALERTS = new Set([
  "DISPATCH_OVERDUE", "DISPATCH_DUE_TODAY", "DISPATCH_WITHOUT_DATE", "COMMISSIONS_IN_REVIEW", "SELLERS_OVERDUE", "SELLERS_PAYABLE",
  "INVOICES_REJECTED", "INVOICES_PENDING", "RETURNS_STALLED", "DISPUTES_OVERDUE", "DISPUTES_TO_DECIDE",
  "PURCHASES_OVERDUE",
]);
