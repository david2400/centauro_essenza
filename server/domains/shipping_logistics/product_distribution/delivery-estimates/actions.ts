'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { delivery_estimates_repository } from './repository';
import type {
  DeliveryEstimateDto,
  CreateDeliveryEstimateDto,
  UpdateDeliveryEstimatePayload,
} from './types';
import { delivery_estimates_tags } from '@/server/lib/cache-tags';
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

export async function create_delivery_estimate_action(
  payload: CreateDeliveryEstimateDto,
): Promise<ActionResult<{ id: number }>> {
  try {
    const result = await delivery_estimates_repository.create_delivery_estimate(payload);
    const id = result.id;
    if (typeof id !== 'number') {
      return { success: false, error: 'delivery_estimate_id_not_returned' };
    }
    revalidateTag(delivery_estimates_tags.list());
    revalidateTag(delivery_estimates_tags.item(id));
    return { success: true, data: { id } };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function update_delivery_estimate_action(
  payload: UpdateDeliveryEstimatePayload,
): Promise<ActionResult> {
  try {
    await delivery_estimates_repository.update_delivery_estimate(payload);
    revalidateTag(delivery_estimates_tags.list());
    revalidateTag(delivery_estimates_tags.item(payload.id));
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function delete_delivery_estimate_action(id: number): Promise<ActionResult> {
  try {
    await delivery_estimates_repository.delete_delivery_estimate(id);
    revalidateTag(delivery_estimates_tags.list());
    revalidateTag(delivery_estimates_tags.item(id));
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
