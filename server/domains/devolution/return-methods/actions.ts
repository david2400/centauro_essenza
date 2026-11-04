'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { return_methods_repository } from './repository';
import type {
  CreateReturnMethodDto,
  UpdateReturnMethodPayload,
  DeleteReturnMethodPayload,
} from './types';
import { return_methods_tags } from '@/server/lib/cache-tags';
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

function revalidate_return_method_tags(id?: number) {
  revalidateTag(return_methods_tags.list());
  if (typeof id === 'number') {
    revalidateTag(return_methods_tags.item(id));
  }
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function create_return_method_action(
  payload: CreateReturnMethodDto,
): Promise<ActionResult<{ id?: number }>> {
  try {
    const result = await return_methods_repository.create_return_method(payload);
    revalidate_return_method_tags(result.id);
    return { success: true, data: { id: result.id } };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function update_return_method_action(
  payload: UpdateReturnMethodPayload,
): Promise<ActionResult> {
  try {
    const result = await return_methods_repository.update_return_method(payload);
    revalidate_return_method_tags(result.id ?? payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function delete_return_method_action(
  payload: DeleteReturnMethodPayload,
): Promise<ActionResult> {
  try {
    await return_methods_repository.delete_return_method(payload);
    revalidate_return_method_tags(payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
