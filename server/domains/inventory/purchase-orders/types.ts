/** Órdenes de compra (draco /inventory/purchase-orders). Tipos escritos a mano hasta regenerar el OpenAPI. */

export type PurchaseOrderStatus = 'DRAFT' | 'SENT' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED' | 'CLOSED';

export interface PurchaseOrderSummaryDto {
  id: number;
  number: string | null;
  supplier_id: number;
  supplier_name: string;
  warehouse_id: number;
  warehouse_name: string | null;
  status: PurchaseOrderStatus;
  expected_date: string | null;
  overdue: boolean;
  total: number;
  ordered_units: number;
  received_units: number;
  created_at: string | null;
}

export interface PurchaseOrderLineDto {
  id: number;
  sku_id: number;
  product_id: number;
  sku_code: string | null;
  product_name: string | null;
  supplier_code: string | null;
  quantity: number;
  received: number;
  pending: number;
  unit_cost: number;
  line_total: number;
}

export interface PurchaseReceiptDto {
  id: number;
  number: string | null;
  warehouse_name: string | null;
  reference: string | null;
  notes: string | null;
  units: number;
  created_by_name: string;
  created_at: string | null;
  lines: { line_id: number; sku_code: string | null; product_name: string | null; quantity: number }[];
}

export interface PurchaseOrderEventDto {
  action: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  actor_name: string;
  created_at: string | null;
}

export interface PurchaseOrderDetailDto {
  summary: PurchaseOrderSummaryDto;
  currency: string;
  notes: string | null;
  status_reason: string | null;
  sent_at: string | null;
  closed_at: string | null;
  lock_version: number;
  created_by_name: string | null;
  lines: PurchaseOrderLineDto[];
  receipts: PurchaseReceiptDto[];
  events: PurchaseOrderEventDto[];
  /** EDIT, SEND, RECEIVE, CANCEL, CLOSE (lo decide draco). */
  actions: string[];
}

export interface PurchaseOrderStatsDto {
  drafts: number;
  open: number;
  overdue: number;
  partially_received: number;
  received_units30: number;
  purchased30: number;
}

export interface SupplierOptionDto {
  id: number;
  name: string;
  status: string;
  lead_time_days: number | null;
  min_order_amount: number | null;
}

export interface SupplierProductDto {
  sku_id: number;
  product_id: number;
  sku_code: string;
  product_name: string | null;
  supplier_code: string | null;
  unit_cost: number | null;
  min_order_qty: number | null;
  preferred: boolean;
}

export interface PurchaseOrderOptionsDto {
  suppliers: SupplierOptionDto[];
  warehouses: { id: number; name: string }[];
}

export interface SavePurchaseOrderRequest {
  supplier_id: number;
  warehouse_id: number;
  expected_date?: string | null;
  notes?: string | null;
  lines: { sku_id: number; quantity: number; unit_cost?: number | null }[];
  lock_version?: number | null;
}

/** Sugerencia de compra desde el stock bajo (GET /suggestions). */
export interface PurchaseSuggestionLineDto {
  sku_id: number;
  product_id: number;
  sku_code: string | null;
  product_name: string | null;
  supplier_code: string | null;
  on_hand: number;
  available: number;
  min_threshold: number;
  on_order: number;
  suggested: number;
  unit_cost: number | null;
  average_cost: number | null;
  line_total: number | null;
}

export interface PurchaseSuggestionGroupDto {
  warehouse_id: number;
  warehouse_name: string | null;
  supplier_id: number | null;
  supplier_name: string | null;
  lead_time_days: number | null;
  min_order_amount: number | null;
  total: number | null;
  below_minimum_amount: boolean;
  lines: PurchaseSuggestionLineDto[];
}

export interface PurchaseSuggestionsDto {
  low_stock_skus: number;
  covered_by_open_orders: number;
  truncated: boolean;
  groups: PurchaseSuggestionGroupDto[];
  without_supplier: PurchaseSuggestionGroupDto[];
}
