'use server';

import { parse_grid_query } from '@/server/lib/pagination';
import type { BulkResult } from '@/shared/models/pagination';
import type { OrderDto } from '@/server/domains/sales/orders/types';
import { ORDER_GRID } from './grid';
import {
  create_order_action,
  update_order_action,
  delete_order_action,
  bulk_delete_orders_action,
  export_orders_action,
  change_order_status_action,
  create_full_order_action,
  save_order_details_action,
  pick_order_action,
  pick_all_order_action,
  ready_order_action,
  ship_order_action,
  deliver_order_action,
  add_order_note_action,
  bulk_order_status_action,
  search_order_customers_action,
  lookup_customer_by_document_action,
} from '@/server/domains/sales/orders/actions';
import {
  create_product_order_action,
  update_product_order_action,
  delete_product_order_action,
} from '@/server/domains/sales/product-orders/actions';
import type {
  ChangeOrderStatusDto,
  CreateOrderDto,
  UpdateOrderDto,
  CreateFullOrderDto,
  SaveOrderDetailsDto,
  PickOrderDto,
  ShipOrderDto,
  OrderEventDto,
  CustomerLookupDto,
  CustomerByDocumentDto,
} from '@/server/domains/sales/orders/types';
import type {
  CreateProductOrderDto,
  UpdateProductOrderDto,
} from '@/server/domains/sales/product-orders/types';

/**
 * Server actions de órdenes e ítems. Devuelven el resultado en lugar de
 * lanzar para que la UI muestre el motivo real del error.
 */
type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

const fail = (error: string | undefined, fallback: string): ActionResult<never> => ({
  success: false,
  error: error ?? fallback,
});

export async function createOrderServerAction(
  payload: CreateOrderDto,
): Promise<ActionResult<{ id?: number }>> {
  const result = await create_order_action(payload);
  return result.success ? { success: true, data: result.data } : fail(result.error, 'No se pudo crear la orden');
}

export async function updateOrderServerAction(payload: UpdateOrderDto): Promise<ActionResult> {
  const result = await update_order_action(payload);
  return result.success ? { success: true } : fail(result.error, 'No se pudo actualizar la orden');
}

export async function deleteOrderServerAction(id: number): Promise<ActionResult> {
  const result = await delete_order_action({ id });
  return result.success ? { success: true } : fail(result.error, 'No se pudo eliminar la orden');
}

export async function createOrderItemServerAction(
  payload: CreateProductOrderDto,
): Promise<ActionResult<{ id?: number }>> {
  const result = await create_product_order_action(payload);
  return result.success ? { success: true, data: result.data } : fail(result.error, 'No se pudo agregar el ítem');
}

export async function updateOrderItemServerAction(payload: UpdateProductOrderDto): Promise<ActionResult> {
  const result = await update_product_order_action(payload);
  return result.success ? { success: true } : fail(result.error, 'No se pudo actualizar el ítem');
}

/** Cambia el estado de la orden (pagar descuenta stock; cancelar lo libera o devuelve). */
export async function changeOrderStatusServerAction(
  id: number,
  state: ChangeOrderStatusDto['state'],
  reason?: string,
): Promise<ActionResult> {
  const result = await change_order_status_action(id, { state, reason });
  return result.success ? { success: true } : fail(result.error, 'No se pudo cambiar el estado de la orden');
}

export async function deleteOrderItemServerAction(id: number, orderId?: number): Promise<ActionResult> {
  const result = await delete_product_order_action({ id, order_id: orderId });
  return result.success ? { success: true } : fail(result.error, 'No se pudo eliminar el ítem');
}

export async function bulkDeleteOrdersServerAction(ids: number[]): Promise<ActionResult<BulkResult>> {
  const result = await bulk_delete_orders_action(ids);
  return result.success ? { success: true, data: result.data } : fail(result.error, 'No se pudieron eliminar las órdenes');
}

/** Exporta todas las órdenes que cumplen la búsqueda actual. */
export async function exportOrdersServerAction(
  params: Record<string, string>,
): Promise<ActionResult<{ items: OrderDto[]; truncated: boolean }>> {
  const result = await export_orders_action(parse_grid_query(params, ORDER_GRID));
  return result.success ? { success: true, data: result.data } : fail(result.error, 'No se pudo exportar');
}

// ─── V16: orden empresarial ──────────────────────────────────────────────────

type DetailedResult<T> =
  | { success: true; data?: T }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

const detailed = <T>(
  result: { success: true; data: T } | { success: false; error: string; field_errors?: Record<string, string> },
  fallback: string,
): DetailedResult<T> =>
  result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error ?? fallback, fieldErrors: result.field_errors };

/** Crea la orden completa (cabecera y productos) y reserva el stock. */
export async function createFullOrderServerAction(payload: CreateFullOrderDto): Promise<DetailedResult<OrderDto>> {
  return detailed(await create_full_order_action(payload), 'No se pudo crear la orden');
}

export async function saveOrderDetailsServerAction(id: number, payload: SaveOrderDetailsDto): Promise<DetailedResult<OrderDto>> {
  return detailed(await save_order_details_action(id, payload), 'No se pudo guardar la orden');
}

export async function pickOrderServerAction(id: number, payload: PickOrderDto): Promise<DetailedResult<OrderDto>> {
  return detailed(await pick_order_action(id, payload), 'No se pudo registrar la preparación');
}

export async function pickAllOrderServerAction(id: number): Promise<DetailedResult<OrderDto>> {
  return detailed(await pick_all_order_action(id, {}), 'No se pudo registrar la preparación');
}

export async function readyOrderServerAction(id: number, note?: string): Promise<DetailedResult<OrderDto>> {
  return detailed(await ready_order_action(id, { note }), 'No se pudo marcar la orden como lista');
}

export async function shipOrderServerAction(id: number, payload: ShipOrderDto): Promise<DetailedResult<OrderDto>> {
  return detailed(await ship_order_action(id, payload), 'No se pudo despachar la orden');
}

export async function deliverOrderServerAction(id: number, note?: string): Promise<DetailedResult<OrderDto>> {
  return detailed(await deliver_order_action(id, { note }), 'No se pudo marcar la orden como entregada');
}

export async function addOrderNoteServerAction(id: number, note: string): Promise<DetailedResult<OrderEventDto>> {
  return detailed(await add_order_note_action(id, { note }), 'No se pudo guardar la nota');
}

export async function bulkOrderStatusServerAction(
  ids: number[],
  state: ChangeOrderStatusDto['state'],
  reason?: string,
): Promise<ActionResult<BulkResult>> {
  const result = await bulk_order_status_action({ ids, state, reason });
  return result.success ? { success: true, data: result.data } : fail(result.error, 'No se pudo cambiar el estado');
}

export async function searchOrderCustomersServerAction(q: string): Promise<CustomerLookupDto[]> {
  return search_order_customers_action(q);
}

/** Cliente por documento: registro central de personas (access_control) y su última orden. */
export async function lookupCustomerByDocumentServerAction(
  docType: string | undefined,
  docNumber: string,
  companyId: number,
): Promise<DetailedResult<CustomerByDocumentDto>> {
  return detailed(await lookup_customer_by_document_action(docType, docNumber, companyId), 'No se pudo consultar el documento');
}
