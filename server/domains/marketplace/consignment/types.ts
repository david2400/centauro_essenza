/** Consignación (draco /marketplace/consignment). Tipos escritos a mano hasta regenerar el OpenAPI. */

export type ConsignmentDocumentKind = 'RECEIPT' | 'RETURN_TO_SELLER' | 'ADJUSTMENT';
export type ConsignmentMovementKind = ConsignmentDocumentKind | 'SALE' | 'SALE_CANCEL' | 'CUSTOMER_RETURN';

export interface ConsignmentStockRowDto {
  id: number;
  seller_id: number;
  seller_name: string;
  sku_id: number;
  sku_code: string;
  product_name: string | null;
  warehouse_id: number;
  warehouse_name: string | null;
  on_hand: number;
  /** Del vendedor y SKU en todas las bodegas. */
  reserved: number;
  available: number;
  first_received_at: string | null;
  last_movement_at: string | null;
  days_in_custody: number | null;
  offer_id: number | null;
  offer_status: string | null;
  offer_fulfillment: string | null;
}

export interface ConsignmentStatsDto {
  units: number;
  skus: number;
  sellers: number;
  warehouses: number;
  reserved_units: number;
  without_platform_offer: number;
}

export interface ConsignmentMovementDto {
  id: number;
  kind: ConsignmentMovementKind;
  quantity: number;
  balance_after: number;
  seller_id: number;
  seller_name: string;
  sku_id: number;
  sku_code: string;
  product_name: string | null;
  warehouse_id: number;
  warehouse_name: string | null;
  document_id: number | null;
  document_number: string | null;
  order_id: number | null;
  order_number: string | null;
  return_case_id: number | null;
  note: string | null;
  created_by: string;
  created_at: string | null;
}

export interface ConsignmentDocumentDto {
  id: number;
  number: string | null;
  kind: ConsignmentDocumentKind;
  seller_id: number;
  seller_name: string;
  warehouse_id: number;
  warehouse_name: string | null;
  reference: string | null;
  notes: string | null;
  units: number;
  created_by: string;
  created_by_name: string | null;
  created_at: string | null;
  lines: ConsignmentMovementDto[] | null;
}

export interface SaveConsignmentDocumentRequest {
  kind: 'RECEIPT' | 'RETURN_TO_SELLER';
  seller_id: number;
  warehouse_id: number;
  reference?: string | null;
  notes?: string | null;
  lines: { sku_id: number; quantity: number }[];
}

export interface ConsignmentAdjustmentRequest {
  seller_id: number;
  warehouse_id: number;
  sku_id: number;
  counted_quantity: number;
  reason: string;
}

export interface ConsignmentOptionDto {
  id: number;
  name: string;
}

export interface ConsignmentOptionsDto {
  sellers: ConsignmentOptionDto[];
  warehouses: ConsignmentOptionDto[];
}
