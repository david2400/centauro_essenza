'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { shipping_costs_repository } from './repository';
import type {
  ShippingCostDto,
  CreateShippingCostDto,
  UpdateShippingCostPayload,
} from './types';
import { shipping_costs_tags } from '@/server/lib/cache-tags';
import { ServerApiError } from '@/server/lib/types';

// ─── Result helpers ──────────────────────────────────────────────────────────

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

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function create_shipping_cost_action(
  payload: CreateShippingCostDto,
): Promise<ActionResult<{ id: number }>> {
  try {
    const result = await shipping_costs_repository.create_shipping_cost(payload);
    const id = result.id;
    if (typeof id !== 'number') {
      return { success: false, error: 'shipping_cost_id_not_returned' };
    }
    revalidateTag(shipping_costs_tags.list());
    revalidateTag(shipping_costs_tags.item(id));
    return { success: true, data: { id } };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function update_shipping_cost_action(
  payload: UpdateShippingCostPayload,
): Promise<ActionResult> {
  try {
    await shipping_costs_repository.update_shipping_cost(payload);
    revalidateTag(shipping_costs_tags.list());
    revalidateTag(shipping_costs_tags.item(payload.id));
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function delete_shipping_cost_action(id: number): Promise<ActionResult> {
  try {
    await shipping_costs_repository.delete_shipping_cost(id);
    revalidateTag(shipping_costs_tags.list());
    revalidateTag(shipping_costs_tags.item(id));
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
