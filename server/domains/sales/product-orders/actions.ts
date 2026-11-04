'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { product_orders_repository } from './repository';
import type { CreateProductOrderPayload, UpdateProductOrderPayload, DeleteProductOrderPayload } from './types';
import { orders_tags, product_orders_tags, stock_tags } from '@/server/lib/cache-tags';
import { ServerApiError } from '@/server/lib/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; status?: number };

function handle_error(error: unknown): ActionResult<never> {
  if (error instanceof ServerApiError) {
    return { success: false, error: error.message, status: error.status };
  }
  const message = error instanceof Error ? error.message : 'Unexpected error';
  return { success: false, error: message };
}

/** Las líneas cambian el total de la orden (lo calcula el backend) y sus reservas. */
function revalidate_product_orders(id?: number, order_id?: number) {
  revalidateTag(product_orders_tags.list());
  if (id != null) {
    revalidateTag(product_orders_tags.item(id));
  }
  revalidateTag(orders_tags.list());
  revalidateTag(stock_tags.all());
  if (order_id != null) {
    revalidateTag(orders_tags.item(order_id));
  }
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function create_product_order_action(
  payload: CreateProductOrderPayload,
): Promise<ActionResult<{ id?: number }>> {
  try {
    const result = await product_orders_repository.create_product_order(payload);
    revalidate_product_orders(result.id, payload.order_id);
    return { success: true, data: { id: result.id } };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function update_product_order_action(payload: UpdateProductOrderPayload): Promise<ActionResult> {
  try {
    await product_orders_repository.update_product_order(payload);
    revalidate_product_orders(payload.id, payload.order_id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function delete_product_order_action(
  payload: DeleteProductOrderPayload & { order_id?: number },
): Promise<ActionResult> {
  try {
    await product_orders_repository.delete_product_order({ id: payload.id });
    revalidate_product_orders(payload.id, payload.order_id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
