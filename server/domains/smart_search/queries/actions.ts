'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { search_queries_repository } from './repository';
import type { CreateSearchQueryPayload, UpdateSearchQueryPayload, DeleteSearchQueryPayload } from './types';
import { search_queries_tags } from '@/server/lib/cache-tags';
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

function revalidate_search_queries(id?: number) {
  revalidateTag(search_queries_tags.list());
  if (id != null) {
    revalidateTag(search_queries_tags.item(id));
  }
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function create_search_query_action(
  payload: CreateSearchQueryPayload,
): Promise<ActionResult<{ id?: number }>> {
  try {
    const result = await search_queries_repository.create_search_query(payload);
    revalidate_search_queries(result.id);
    return { success: true, data: { id: result.id } };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function update_search_query_action(payload: UpdateSearchQueryPayload): Promise<ActionResult> {
  try {
    await search_queries_repository.update_search_query(payload);
    revalidate_search_queries(payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function delete_search_query_action(payload: DeleteSearchQueryPayload): Promise<ActionResult> {
  try {
    await search_queries_repository.delete_search_query(payload);
    revalidate_search_queries(payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
