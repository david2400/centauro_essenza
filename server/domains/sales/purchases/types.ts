import type { SaveOrderDetailsDto } from '@/server/domains/sales/orders/types';

/** Compras multivendedor (draco /sales/purchases). Tipos escritos a mano hasta regenerar el OpenAPI. */

export const PURCHASE_STATUSES = ['PENDING', 'PARTIALLY_PAID', 'PAID', 'IN_DELIVERY', 'DELIVERED', 'CANCELLED'] as const;
export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];

export interface PurchaseLineInput {
  sku_id: number;
  /** Oferta de un vendedor externo; vacío = venta propia con el precio del catálogo. */
  offer_id?: number | null;
  quantity: number;
}

export interface CreatePurchaseRequest {
  details: SaveOrderDetailsDto;
  lines: PurchaseLineInput[];
}

export interface PurchaseSummaryDto {
  id: number;
  number: string;
  status: PurchaseStatus;
  partially_cancelled: boolean;
  channel: string;
  currency: string;
  total: number;
  sub_orders: number;
  sellers: number;
  customer_name: string | null;
  customer_doc_number: string | null;
  created_at: string | null;
}

export interface SubOrderDto {
  order_id: number;
  order_number: string | null;
  state: string;
  total: number;
  seller_id: number | null;
  seller_name: string | null;
  external: boolean;
  items: number;
  units: number;
  paid_at: string | null;
}

export interface PurchaseDetailDto {
  id: number;
  number: string;
  status: PurchaseStatus;
  partially_cancelled: boolean;
  channel: string;
  currency: string;
  total: number;
  pending_total: number;
  customer_name: string | null;
  customer_doc_type: string | null;
  customer_doc_number: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  created_by: string;
  created_by_name: string | null;
  created_at: string | null;
  sub_orders: SubOrderDto[];
}

export interface OfferOptionDto {
  offer_id: number;
  seller_id: number;
  seller_name: string;
  price: number;
  available_quantity: number;
  handling_days: number;
  condition: string;
}

export interface SkuOptionsDto {
  sku_id: number;
  code: string | null;
  name: string | null;
  own_sellable: boolean;
  own_price: number | null;
  currency: string;
  offers: OfferOptionDto[];
}

export interface OrderPurchaseDto {
  purchase_id: number;
  purchase_number: string;
  seller_id: number | null;
  seller_name: string | null;
  external: boolean;
  sub_orders: number;
}

export const SALES_PERMISSIONS = { view: 'VENTAS.VER', manage: 'VENTAS.GESTIONAR' } as const;

export interface IPurchaseAccess {
  view: boolean;
  manage: boolean;
}

export const purchaseAccessFrom = (permissions?: readonly string[] | null): IPurchaseAccess => {
  const granted = new Set(permissions ?? []);
  return { view: granted.has(SALES_PERMISSIONS.view) || granted.has(SALES_PERMISSIONS.manage), manage: granted.has(SALES_PERMISSIONS.manage) };
};
