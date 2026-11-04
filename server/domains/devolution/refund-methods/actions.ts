'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { refund_methods_repository } from './repository';
import type {
  CreateRefundMethodDto,
  UpdateRefundMethodPayload,
  DeleteRefundMethodPayload,
} from './types';
import { refund_methods_tags } from '@/server/lib/cache-tags';
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

function revalidate_refund_method_tags(id?: number) {
  revalidateTag(refund_methods_tags.list());
  if (typeof id === 'number') {
    revalidateTag(refund_methods_tags.item(id));
  }
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function create_refund_method_action(
  payload: CreateRefundMethodDto,
): Promise<ActionResult<{ id?: number }>> {
  try {
    const result = await refund_methods_repository.create_refund_method(payload);
    revalidate_refund_method_tags(result.id);
    return { success: true, data: { id: result.id } };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function update_refund_method_action(
  payload: UpdateRefundMethodPayload,
): Promise<ActionResult> {
  try {
    const result = await refund_methods_repository.update_refund_method(payload);
    revalidate_refund_method_tags(result.id ?? payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function delete_refund_method_action(
  payload: DeleteRefundMethodPayload,
): Promise<ActionResult> {
  try {
    await refund_methods_repository.delete_refund_method(payload);
    revalidate_refund_method_tags(payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
