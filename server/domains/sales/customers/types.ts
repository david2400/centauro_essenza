/** Clientes persistentes y ficha 360 (draco /sales/customers). Tipos escritos a mano hasta regenerar el OpenAPI. */

/** Cliente registrado para un documento (id null si aún no existe). */
export interface CustomerLinkDto {
  id: number | null;
  doc_type: string | null;
  doc_number: string | null;
}

export interface SaveCustomerRequest {
  kind?: string | null;
  doc_type: string;
  doc_number: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  billing_address?: string | null;
  billing_city?: string | null;
  store_user_id?: number | null;
  marketing_consent: boolean;
  notes?: string | null;
  lock_version?: number | null;
}

export interface CustomerSummaryDto {
  id: number;
  kind: string;
  doc_type: string;
  doc_number: string;
  name: string;
  email: string | null;
  phone: string | null;
  billing_city: string | null;
  marketing_consent: boolean;
  orders_count: number;
  total_spent: number;
  last_order_at: string | null;
}

export interface CustomerRecentOrderDto {
  id: number;
  order_number: string | null;
  state: string;
  total: number;
  returned: number;
  channel: string;
  third_party: boolean;
  purchase_id: number | null;
  created_at: string | null;
}

export interface CustomerOverviewDto {
  orders: number;
  active_orders: number;
  cancelled: number;
  pending_orders: number;
  spent: number;
  own_spent: number;
  marketplace_spent: number;
  returned: number;
  pending_amount: number;
  average_ticket: number;
  purchases: number;
  first_order_at: string | null;
  last_order_at: string | null;
  days_since_last_order: number | null;
  by_channel: { channel: string; orders: number; spent: number }[];
  recent_orders: CustomerRecentOrderDto[];
}

export interface CustomerDetailDto {
  id: number;
  kind: string;
  doc_type: string;
  doc_number: string;
  name: string;
  email: string | null;
  phone: string | null;
  billing_address: string | null;
  billing_city: string | null;
  store_user_id: number | null;
  marketing_consent: boolean;
  consent_at: string | null;
  notes: string | null;
  source: string;
  lock_version: number;
  created_at: string | null;
  created_by: string;
  updated_at: string | null;
  updated_by: string;
  overview: CustomerOverviewDto;
  /** Cada bloque llega null si el usuario no puede ver ese módulo (POSTVENTA / FACTURACION). */
  after_sales: CustomerAfterSalesDto | null;
}

export interface CustomerReturnDto {
  id: number;
  order_id: number;
  order_number: string | null;
  state: string;
  requested: number;
  refunded: number;
  created_at: string | null;
}

export interface CustomerReturnsDto {
  total: number;
  open: number;
  refunded: number;
  recent: CustomerReturnDto[];
}

export interface CustomerInvoiceDto {
  id: number;
  order_id: number;
  kind: string;
  number: string;
  status: string;
  total: number;
  issued_at: string | null;
}

export interface CustomerInvoicesDto {
  invoices: number;
  credit_notes: number;
  pending: number;
  invoiced: number;
  recent: CustomerInvoiceDto[];
}

export interface CustomerAfterSalesDto {
  returns: CustomerReturnsDto | null;
  invoices: CustomerInvoicesDto | null;
}
