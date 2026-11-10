'use server';

import { parse_grid_query } from '@/server/lib/pagination';
import type { BulkResult } from '@/shared/models/pagination';
import type { DispatchProductDto } from '@/server/domains/shipping_logistics/dispatch/dispatch-products/types';
import { DISPATCH_GRID } from './grid';
import {
  create_dispatch_product_action,
  update_dispatch_product_action,
  delete_dispatch_product_action,
  bulk_delete_dispatch_products_action,
  export_dispatch_products_action,
} from '@/server/domains/shipping_logistics/dispatch/dispatch-products/actions';
import type {
  CreateDispatchProductDto,
  UpdateDispatchProductPayload,
} from '@/server/domains/shipping_logistics/dispatch/dispatch-products/types';
import {
  create_dispatch_detail_action,
  delete_dispatch_detail_action,
  create_tracking_action,
  delete_tracking_action,
} from '@/server/domains/shipping_logistics/product_distribution/shipping-logistics/actions';

/**
 * Server actions de la ruta. Devuelven el resultado en lugar de lanzar,
 * para que la UI pueda mostrar el motivo real del error.
 */
type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

const fail = (error: string | undefined, fallback: string): ActionResult<never> => ({
  success: false,
  error: error ?? fallback,
});

// ─── Despachos ────────────────────────────────────────────────────────────────

export async function createDispatchServerAction(
  payload: CreateDispatchProductDto,
): Promise<ActionResult<{ id?: number }>> {
  const result = await create_dispatch_product_action(payload);
  return result.success
    ? { success: true, data: result.data }
    : fail(result.error, 'No se pudo registrar el despacho');
}

export async function updateDispatchServerAction(
  payload: UpdateDispatchProductPayload,
): Promise<ActionResult> {
  const result = await update_dispatch_product_action(payload);
  return result.success ? { success: true } : fail(result.error, 'No se pudo actualizar el despacho');
}

export async function deleteDispatchServerAction(id: number): Promise<ActionResult> {
  const result = await delete_dispatch_product_action({ id });
  return result.success ? { success: true } : fail(result.error, 'No se pudo eliminar el despacho');
}

// ─── Líneas del despacho ─────────────────────────────────────────────────────

export async function addDispatchLineServerAction(
  dispatchProductId: number,
  productOrderId: number,
): Promise<ActionResult<{ id?: number }>> {
  const result = await create_dispatch_detail_action({ dispatch_product_id: dispatchProductId, product_order_id: productOrderId });
  return result.success
    ? { success: true, data: result.data }
    : fail(result.error, 'No se pudo agregar el producto al despacho');
}

export async function deleteDispatchLineServerAction(id: number): Promise<ActionResult> {
  const result = await delete_dispatch_detail_action(id);
  return result.success ? { success: true } : fail(result.error, 'No se pudo quitar el producto');
}

// ─── Seguimiento ─────────────────────────────────────────────────────────────

export async function addTrackingServerAction(
  dispatchProductId: number,
): Promise<ActionResult<{ id?: number }>> {
  const result = await create_tracking_action({ dispatch_product_id: dispatchProductId });
  return result.success
    ? { success: true, data: result.data }
    : fail(result.error, 'No se pudo registrar el evento de seguimiento');
}

export async function deleteTrackingServerAction(id: number): Promise<ActionResult> {
  const result = await delete_tracking_action(id);
  return result.success ? { success: true } : fail(result.error, 'No se pudo eliminar el evento');
}

// ─── Lote y exportación ──────────────────────────────────────────────────────

export async function bulkDeleteDispatchesServerAction(ids: number[]): Promise<ActionResult<BulkResult>> {
  const result = await bulk_delete_dispatch_products_action(ids);
  return result.success ? { success: true, data: result.data } : fail(result.error, 'No se pudieron eliminar los despachos');
}

/** Exporta todos los despachos que cumplen la búsqueda actual. */
export async function exportDispatchesServerAction(
  params: Record<string, string>,
): Promise<ActionResult<{ items: DispatchProductDto[]; truncated: boolean }>> {
  const result = await export_dispatch_products_action(parse_grid_query(params, DISPATCH_GRID));
  return result.success ? { success: true, data: result.data } : fail(result.error, 'No se pudo exportar');
}
