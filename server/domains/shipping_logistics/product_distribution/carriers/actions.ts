'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { carriers_repository } from './repository';
import type { CreateCarrierDto, UpdateCarrierPayload } from './types';
import { carriers_tags } from '@/server/lib/cache-tags';
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

export async function create_carrier_action(
  payload: CreateCarrierDto,
): Promise<ActionResult<{ id: number }>> {
  try {
    const result = await carriers_repository.create_carrier(payload);
    const id = result.id;
    if (typeof id !== 'number') {
      return { success: false, error: 'carrier_id_not_returned' };
    }
    revalidateTag(carriers_tags.list());
    revalidateTag(carriers_tags.item(id));
    return { success: true, data: { id } };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function update_carrier_action(
  payload: UpdateCarrierPayload,
): Promise<ActionResult> {
  try {
    await carriers_repository.update_carrier(payload);
    revalidateTag(carriers_tags.list());
    revalidateTag(carriers_tags.item(payload.id));
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function delete_carrier_action(id: number): Promise<ActionResult> {
  try {
    await carriers_repository.delete_carrier(id);
    revalidateTag(carriers_tags.list());
    revalidateTag(carriers_tags.item(id));
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
