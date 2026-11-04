'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { categories_repository } from './repository';
import { categories_resource } from './search';
import type { CategoryDto } from './types';
import type { BulkResult, GridQuery } from '@/shared/models/pagination';
import type { CreateCategoryPayload, UpdateCategoryPayload, DeleteCategoryPayload } from './types';
import { categories_tags } from '@/server/lib/cache-tags';
import { ServerApiError } from '@/server/lib/types';
import { field_errors_from } from '@/server/lib/pagination';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; status?: number; fieldErrors?: Record<string, string> };

function handle_error(error: unknown): ActionResult<never> {
  if (error instanceof ServerApiError) {
    return {
      success: false,
      error: error.message,
      status: error.status,
      fieldErrors: field_errors_from(error),
    };
  }
  const message = error instanceof Error ? error.message : 'Unexpected error';
  return { success: false, error: message };
}

function revalidate_category_tag(id: number) {
  revalidateTag(categories_tags.item(id));
  revalidateTag(categories_tags.list());
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function create_category_action(
  payload: CreateCategoryPayload,
): Promise<ActionResult<{ id?: number }>> {
  try {
    const result = await categories_repository.create_category(payload);
    revalidateTag(categories_tags.list());
    if (result.id) {
      revalidate_category_tag(result.id);
    }
    return { success: true, data: { id: result.id } };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function update_category_action(
  payload: UpdateCategoryPayload,
): Promise<ActionResult> {
  try {
    const result = await categories_repository.update_category(payload);
    revalidate_category_tag(result.id ?? payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function delete_category_action(
  payload: DeleteCategoryPayload,
): Promise<ActionResult> {
  try {
    await categories_repository.delete_category(payload);
    revalidate_category_tag(payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

// ─── Lote y exportación ──────────────────────────────────────────────────────

export async function bulk_delete_categories_action(
  ids: number[],
): Promise<ActionResult<BulkResult>> {
  try {
    const result = await categories_resource.bulk_delete(ids);
    revalidateTag(categories_tags.list());
    for (const id of ids) revalidateTag(categories_tags.item(id));
    return { success: true, data: result };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function export_categories_action(
  query: GridQuery,
): Promise<ActionResult<{ items: CategoryDto[]; truncated: boolean }>> {
  try {
    return { success: true, data: await categories_resource.export_all(query) };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
