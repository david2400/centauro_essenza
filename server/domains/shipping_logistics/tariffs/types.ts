/**
 * Tarifario de envíos (draco /shipping_logistics/tariffs). Espejo de TariffDtos.java: JSON en snake_case.
 * Zonas: LOCAL (misma ciudad), REGIONAL (mismo departamento), NATIONAL (resto) o Z<id> (zona propia).
 */
export interface TariffBracketDto {
  min_kg: number;
  max_kg: number | null;
  price: number;
  per_kg_over: number | null;
}

export interface TariffZoneRateDto {
  zone_key: string;
  zone_name: string | null;
  min_days: number;
  max_days: number;
  free_from: number | null;
  active: boolean;
  brackets: TariffBracketDto[];
}

export interface RateCardDto {
  id: number;
  carrier_id: number;
  carrier_name: string | null;
  name: string;
  volumetric_divisor: number;
  default_weight_kg: number;
  min_charge: number;
  insurance_pct: number;
  insurance_min: number;
  active: boolean;
  version: number;
  rates: TariffZoneRateDto[];
  updated_by_name: string | null;
  updated_at: string | null;
}

export interface SaveRateCardRequest {
  carrier_id: number;
  name: string;
  volumetric_divisor?: number | null;
  default_weight_kg?: number | null;
  min_charge?: number | null;
  insurance_pct?: number | null;
  insurance_min?: number | null;
  active?: boolean | null;
  version?: number | null;
}

export interface SaveZoneRateRequest {
  version: number;
  min_days: number;
  max_days: number;
  free_from?: number | null;
  active?: boolean | null;
  brackets: TariffBracketDto[];
}

export interface TariffPlaceDto {
  country_id: number;
  state_id: number | null;
  city_id: number | null;
  label: string | null;
}

export interface TariffZoneDto {
  id: number;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  version: number;
  zone_key: string;
  places: TariffPlaceDto[];
  rates_count: number;
  updated_by_name: string | null;
  updated_at: string | null;
}

export interface SaveTariffZoneRequest {
  code: string;
  name: string;
  description?: string | null;
  active?: boolean | null;
  version?: number | null;
  places: TariffPlaceDto[];
}

export interface ShippingQuoteItem {
  sku_id?: number | null;
  product_id?: number | null;
  quantity: number;
}

export interface ShippingQuotePiece {
  weight_kg?: number | null;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  quantity?: number | null;
}

export interface ShippingQuoteRequest {
  origin_warehouse_id?: number | null;
  country_id: number;
  state_id: number;
  city_id: number;
  destination_label?: string | null;
  items?: ShippingQuoteItem[];
  pieces?: ShippingQuotePiece[];
  declared_value?: number | null;
  order_subtotal?: number | null;
  ship_date?: string | null;
  carrier_id?: number | null;
}

/** Opción de una transportadora. `total` es lo que se cobra (0 si `free`). */
export interface ShippingOptionDto {
  rate_card_id: number;
  carrier_id: number;
  carrier_name: string | null;
  zone_key: string;
  zone_name: string | null;
  actual_kg: number;
  volumetric_kg: number;
  chargeable_kg: number;
  weight_estimated: boolean;
  freight: number;
  insurance: number;
  total: number;
  free: boolean;
  min_days: number;
  max_days: number;
  delivery_from: string | null;
  delivery_to: string | null;
}

export interface ShippingQuoteDto {
  zone_key: string;
  zone_name: string | null;
  origin_warehouse_id: number | null;
  /** Solo lo trae el simulador; en la orden: options.length > 0. */
  covered?: boolean;
  options: ShippingOptionDto[];
}

/**
 * Cotización de la orden (draco /sales/orders/shipping-quote): líneas con SKU, bodega y subtotal. Sin líneas y con
 * `order_id`, draco usa las líneas guardadas de esa orden.
 */
export interface OrderShippingQuoteRequest {
  order_id?: number | null;
  warehouse_id?: number | null;
  country_id: number;
  state_id: number;
  city_id: number;
  destination_label?: string | null;
  lines?: { sku_id?: number | null; product_id?: number | null; quantity: number }[];
  subtotal?: number | null;
  declared_value?: number | null;
  carrier_id?: number | null;
}

export interface CoverageGapDto {
  country_id: number;
  state_id: number;
  city_id: number;
  label: string | null;
  zone_key: string | null;
  misses: number;
  last_at: string | null;
}
