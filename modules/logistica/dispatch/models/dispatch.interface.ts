/** @format */

import type {
  CreateDispatchProductDto,
  DispatchProductDto,
  UpdateDispatchProductPayload,
} from "@/server/domains/shipping_logistics/dispatch/dispatch-products/types";
import type {
  DispatchDetailDto,
  TrackingDto,
} from "@/server/domains/shipping_logistics/product_distribution/shipping-logistics/types";

/**
 * Tipos del módulo de despachos. Se reutilizan los DTO generados desde
 * `endpoint.json` (import de solo tipos: no arrastra código de servidor).
 */
export type IDispatch = DispatchProductDto;
export type IDispatchCreateRequest = CreateDispatchProductDto;
export type IDispatchUpdateRequest = UpdateDispatchProductPayload;
export type IDispatchLine = DispatchDetailDto;
export type IDispatchTracking = TrackingDto;

/** Orden que puede despacharse. */
export interface IDispatchOrder {
  id?: number;
  name?: string;
}

/** Línea de la orden que puede incluirse en el despacho. */
export interface IDispatchOrderLine {
  id?: number;
  product_name: string;
  quantity: number;
}

/** Transportadora (para nombres en el despacho). */
export interface IDispatchCarrier {
  id?: number;
  name?: string;
  code?: string;
}

/**
 * Lo que se envía en el despacho, tomado de su orden: destino del catálogo (ids), bodega que despacha, subtotal y
 * líneas con SKU. Con esto el cotizador trae solo las opciones del tarifario.
 */
export interface IDispatchShipment {
  order_id?: number;
  country_id?: number | null;
  state_id?: number | null;
  city_id?: number | null;
  destination_label?: string | null;
  warehouse_id?: number | null;
  subtotal?: number | null;
  carrier_id?: number | null;
  shipping_amount?: number | null;
  lines: { sku_id?: number | null; product_id?: number | null; quantity: number }[];
}
