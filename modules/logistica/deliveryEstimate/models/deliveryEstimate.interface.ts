/** @format */

import type { DeliveryEstimateDto } from "@/server/domains/shipping_logistics/product_distribution/delivery-estimates/types";

/**
 * Tipos del módulo. Se reutilizan los DTO generados desde `endpoint.json`
 * (import de solo tipos: no arrastra código de servidor al cliente).
 */
export type IDeliveryEstimate = DeliveryEstimateDto;

/** Transportadora disponible para estimar. */
export interface IDeliveryCarrier {
  id?: number;
  name?: string;
  max_delivery_days?: number;
  is_active?: boolean;
}
