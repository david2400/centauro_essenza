/** @format */

export type {
  CreatePurchaseRequest,
  OfferOptionDto as IOfferOption,
  OrderPurchaseDto as IOrderPurchase,
  PurchaseDetailDto as IPurchaseDetail,
  PurchaseSummaryDto as IPurchaseSummary,
  SkuOptionsDto as ISkuOptions,
  SubOrderDto as ISubOrder,
  IPurchaseAccess,
} from "@/server/domains/sales/purchases/types";
export { PURCHASE_STATUSES, type PurchaseStatus } from "@/server/domains/sales/purchases/types";

export const PURCHASES_HREF = "/ventas/purchases";
/** Valor del selector de vendedor para la venta propia (sin oferta). */
export const OWN_SELLER = "own";
