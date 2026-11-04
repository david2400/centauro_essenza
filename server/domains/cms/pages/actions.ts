'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { pages_repository } from './repository';
import type { CreatePagePayload, UpdatePagePayload, DeletePagePayload } from './types';
import { pages_tags } from '@/server/lib/cache-tags';
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

function revalidate_pages(id?: number) {
  revalidateTag(pages_tags.list());
  if (id != null) {
    revalidateTag(pages_tags.item(id));
  }
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function create_page_action(
  payload: CreatePagePayload,
): Promise<ActionResult<{ id?: number }>> {
  try {
    const result = await pages_repository.create_page(payload);
    revalidate_pages(result.id);
    return { success: true, data: { id: result.id } };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function update_page_action(payload: UpdatePagePayload): Promise<ActionResult> {
  try {
    await pages_repository.update_page(payload);
    revalidate_pages(payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function delete_page_action(payload: DeletePagePayload): Promise<ActionResult> {
  try {
    await pages_repository.delete_page(payload);
    revalidate_pages(payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
