import 'server-only';

import type { components } from '@/server/lib/essenza-openapi-types';

/** V19: compra multivendedor y vendedor del subpedido (aún no están en el OpenAPI generado). */
export type OrderDto = components['schemas']['OrderDto'] & {
  purchase_id?: number | null;
  seller_id?: number | null;
  third_party_sale?: boolean | null;
};
export type CreateOrderDto = components['schemas']['CreateOrderDto'];
export type UpdateOrderDto = components['schemas']['UpdateOrderDto'];
export type ChangeOrderStatusDto = components['schemas']['ChangeOrderStatusDto'];
export type OrderReservationDto = components['schemas']['OrderReservationDto'];

// V16: orden empresarial
export type SaveOrderDetailsDto = components['schemas']['SaveOrderDetailsDto'];
export type CreateFullOrderDto = components['schemas']['CreateFullOrderDto'];
/** V19: ventas propias frente a las de vendedores externos (que no son ingreso propio). */
export type OrderSummaryDto = components['schemas']['OrderSummaryDto'] & {
  own_sales?: number;
  marketplace_sales?: number;
};
export type OrderEventDto = components['schemas']['OrderEventDto'];
export type CustomerLookupDto = components['schemas']['CustomerLookupDto'];
export type CustomerByDocumentDto = components['schemas']['CustomerByDocumentDto'];
export type OrderNumberingDto = components['schemas']['OrderNumberingDto'];
export type PickOrderDto = components['schemas']['PickOrderDto'];
export type ShipOrderDto = components['schemas']['ShipOrderDto'];
export type OrderActionDto = components['schemas']['OrderActionDto'];
export type BulkOrderStatusDto = components['schemas']['BulkOrderStatusDto'];

export type CreateOrderPayload = CreateOrderDto;
export type UpdateOrderPayload = UpdateOrderDto;

export type DeleteOrderPayload = {
  id: number;
};

/** Filtros del listado (mismos nombres que el backend). */
export type OrderFilterParams = Partial<
  Record<'q' | 'state' | 'channel' | 'storeId' | 'priority' | 'deliveryMethod' | 'paymentStatus' | 'period' | 'overdue' | 'origin', string>
>;
