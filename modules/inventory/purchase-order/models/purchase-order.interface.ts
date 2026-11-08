/** @format */

export type {
  PurchaseOrderDetailDto as IPurchaseOrderDetail,
  PurchaseOrderOptionsDto as IPurchaseOrderOptions,
  PurchaseOrderStatsDto as IPurchaseOrderStats,
  PurchaseOrderStatus,
  PurchaseOrderSummaryDto as IPurchaseOrderSummary,
  PurchaseSuggestionGroupDto as IPurchaseSuggestionGroup,
  PurchaseSuggestionLineDto as IPurchaseSuggestionLine,
  PurchaseSuggestionsDto as IPurchaseSuggestions,
  SupplierProductDto as ISupplierProduct,
} from "@/server/domains/inventory/purchase-orders/types";

export const PURCHASE_ORDERS_HREF = "/inventory/purchase-orders";
export const PURCHASE_ORDER_FILTERS = ["OPEN", "OVERDUE", "DRAFT", "SENT", "PARTIALLY_RECEIVED", "RECEIVED", "CLOSED", "CANCELLED"] as const;

export const PURCHASE_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  SENT: "default",
  PARTIALLY_RECEIVED: "secondary",
  RECEIVED: "outline",
  CANCELLED: "outline",
  CLOSED: "outline",
};
