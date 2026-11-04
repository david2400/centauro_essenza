'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { subcategories_repository } from './repository';
import { subcategories_resource } from './search';
import type { SubcategoryDto } from './types';
import type { BulkResult, GridQuery } from '@/shared/models/pagination';
import type {
  CreateSubcategoryPayload,
  UpdateSubcategoryPayload,
  DeleteSubcategoryPayload,
} from './types';
import { subcategories_tags } from '@/server/lib/cache-tags';
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

function revalidate_subcategory_tag(id: number) {
  revalidateTag(subcategories_tags.item(id));
  revalidateTag(subcategories_tags.list());
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function create_subcategory_action(
  payload: CreateSubcategoryPayload,
): Promise<ActionResult<{ id?: number }>> {
  try {
    const result = await subcategories_repository.create_subcategory(payload);
    revalidateTag(subcategories_tags.list());
    if (result.id) {
      revalidate_subcategory_tag(result.id);
    }
    return { success: true, data: { id: result.id } };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function update_subcategory_action(
  payload: UpdateSubcategoryPayload,
): Promise<ActionResult> {
  try {
    const result = await subcategories_repository.update_subcategory(payload);
    revalidate_subcategory_tag(result.id ?? payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function delete_subcategory_action(
  payload: DeleteSubcategoryPayload,
): Promise<ActionResult> {
  try {
    await subcategories_repository.delete_subcategory(payload);
    revalidate_subcategory_tag(payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

// ─── Lote y exportación ──────────────────────────────────────────────────────

export async function bulk_delete_subcategories_action(
  ids: number[],
): Promise<ActionResult<BulkResult>> {
  try {
    const result = await subcategories_resource.bulk_delete(ids);
    revalidateTag(subcategories_tags.list());
    for (const id of ids) revalidateTag(subcategories_tags.item(id));
    return { success: true, data: result };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function export_subcategories_action(
  query: GridQuery,
): Promise<ActionResult<{ items: SubcategoryDto[]; truncated: boolean }>> {
  try {
    return { success: true, data: await subcategories_resource.export_all(query) };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
