'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { motive_devolutions_repository } from './repository';
import type {
  CreateMotiveDevolutionDto,
  UpdateMotiveDevolutionPayload,
  DeleteMotiveDevolutionPayload,
} from './types';
import { motive_devolutions_tags } from '@/server/lib/cache-tags';
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

function revalidate_motive_devolution_tags(id?: number) {
  revalidateTag(motive_devolutions_tags.list());
  if (typeof id === 'number') {
    revalidateTag(motive_devolutions_tags.item(id));
  }
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function create_motive_devolution_action(
  payload: CreateMotiveDevolutionDto,
): Promise<ActionResult<{ id?: number }>> {
  try {
    const result = await motive_devolutions_repository.create_motive_devolution(payload);
    revalidate_motive_devolution_tags(result.id);
    return { success: true, data: { id: result.id } };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function update_motive_devolution_action(
  payload: UpdateMotiveDevolutionPayload,
): Promise<ActionResult> {
  try {
    const result = await motive_devolutions_repository.update_motive_devolution(payload);
    revalidate_motive_devolution_tags(result.id ?? payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function delete_motive_devolution_action(
  payload: DeleteMotiveDevolutionPayload,
): Promise<ActionResult> {
  try {
    await motive_devolutions_repository.delete_motive_devolution(payload);
    revalidate_motive_devolution_tags(payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
