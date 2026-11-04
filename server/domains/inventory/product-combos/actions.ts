'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { product_combos_repository } from './repository';
import type {
  CreateProductComboDto,
  UpdateProductComboPayload,
  DeleteProductComboPayload,
} from './types';
import { product_combos_tags, products_tags, stock_tags } from '@/server/lib/cache-tags';
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

/** Cambian los SKUs, el stock o los componentes del producto: también su ficha y listados. */
function revalidate_product_combo_tags(id?: number) {
  revalidateTag(product_combos_tags.list());
  revalidateTag(products_tags.list());
  revalidateTag(stock_tags.all());
  if (typeof id === 'number') {
    revalidateTag(product_combos_tags.item(id));
  }
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function create_product_combo_action(
  payload: CreateProductComboDto,
): Promise<ActionResult<{ id?: number }>> {
  try {
    const result = await product_combos_repository.create_product_combo(payload);
    revalidate_product_combo_tags(result.id);
    return { success: true, data: { id: result.id } };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function update_product_combo_action(
  payload: UpdateProductComboPayload,
): Promise<ActionResult> {
  try {
    const result = await product_combos_repository.update_product_combo(payload);
    revalidate_product_combo_tags(result.id ?? payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function delete_product_combo_action(
  payload: DeleteProductComboPayload,
): Promise<ActionResult> {
  try {
    await product_combos_repository.delete_product_combo(payload);
    revalidate_product_combo_tags(payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
