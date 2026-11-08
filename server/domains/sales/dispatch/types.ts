/** Tablero de despachos por subpedido (draco /sales/dispatch). Tipos escritos a mano hasta regenerar el OpenAPI. */

export type DispatchUrgency = 'NONE' | 'ON_TIME' | 'DUE_TODAY' | 'OVERDUE';

export interface DispatchRowDto {
  /** Igual a order_id (lo agrega el repositorio para la grilla). */
  id: number;
  order_id: number;
  order_number: string | null;
  state: string;
  delivery_method: string | null;
  purchase_id: number | null;
  purchase_number: string | null;
  seller_id: number | null;
  seller_name: string | null;
  third_party: boolean;
  customer_name: string | null;
  ship_city: string | null;
  total: number;
  paid_at: string | null;
  ship_by: string | null;
  urgency: DispatchUrgency;
  days_late: number;
  shipped_at: string | null;
  delivered_at: string | null;
  carrier_id: number | null;
  carrier_name: string | null;
  tracking_number: string | null;
  /** Subpedido externo que despacha la tienda desde la consignación del vendedor. */
  consignment: boolean;
}

export interface SellerLoadDto {
  seller_id: number | null;
  seller_name: string | null;
  third_party: boolean;
  to_ship: number;
  overdue: number;
}

export interface DispatchStatsDto {
  to_ship: number;
  overdue: number;
  due_today: number;
  in_transit: number;
  delivered30: number;
  shipped30: number;
  on_time30: number;
  on_time_rate: number | null;
  without_ship_by: number;
  by_seller: SellerLoadDto[];
}
