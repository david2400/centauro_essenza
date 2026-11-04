'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { shipping_logistics_repository } from './repository';
import {
  CreateDispatchDetailDto,
  CreateTrackingDto,
  UpdateDispatchDetailPayload,
  UpdateTrackingPayload,
} from './types';
import { shipping_logistics_tags } from '@/server/lib/cache-tags';
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

// ─── Tracking actions ────────────────────────────────────────────────────────

export async function create_tracking_action(
  payload: CreateTrackingDto,
): Promise<ActionResult<{ id: number }>> {
  try {
    const result = await shipping_logistics_repository.create_tracking(payload);
    const id = result.id;
    if (typeof id !== 'number') {
      return { success: false, error: 'tracking_id_not_returned' };
    }
    revalidateTag(shipping_logistics_tags.trackings());
    return { success: true, data: { id } };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function update_tracking_action(
  payload: UpdateTrackingPayload,
): Promise<ActionResult> {
  try {
    await shipping_logistics_repository.update_tracking(payload);
    revalidateTag(shipping_logistics_tags.trackings());
    revalidateTag(shipping_logistics_tags.tracking(payload.id));
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function delete_tracking_action(id: number): Promise<ActionResult> {
  try {
    await shipping_logistics_repository.delete_tracking(id);
    revalidateTag(shipping_logistics_tags.trackings());
    revalidateTag(shipping_logistics_tags.tracking(id));
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

// ─── Dispatch detail actions ────────────────────────────────────────────────

export async function create_dispatch_detail_action(
  payload: CreateDispatchDetailDto,
): Promise<ActionResult<{ id: number }>> {
  try {
    const result = await shipping_logistics_repository.create_dispatch_detail(payload);
    const id = result.id;
    if (typeof id !== 'number') {
      return { success: false, error: 'dispatch_detail_id_not_returned' };
    }
    revalidateTag(shipping_logistics_tags.dispatch_details());
    return { success: true, data: { id } };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function update_dispatch_detail_action(
  payload: UpdateDispatchDetailPayload,
): Promise<ActionResult> {
  try {
    await shipping_logistics_repository.update_dispatch_detail(payload);
    revalidateTag(shipping_logistics_tags.dispatch_details());
    revalidateTag(shipping_logistics_tags.dispatch_detail(payload.id));
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function delete_dispatch_detail_action(id: number): Promise<ActionResult> {
  try {
    await shipping_logistics_repository.delete_dispatch_detail(id);
    revalidateTag(shipping_logistics_tags.dispatch_details());
    revalidateTag(shipping_logistics_tags.dispatch_detail(id));
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
