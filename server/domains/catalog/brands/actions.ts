'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { brands_repository } from './repository';
import { brands_resource } from './search';
import type { BrandDto } from './types';
import type { BulkResult, GridQuery } from '@/shared/models/pagination';
import type { CreateBrandPayload, UpdateBrandPayload, DeleteBrandPayload } from './types';
import { brands_tags } from '@/server/lib/cache-tags';
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

function revalidate_brand_tag(id: number) {
  revalidateTag(brands_tags.item(id));
  revalidateTag(brands_tags.list());
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function create_brand_action(
  payload: CreateBrandPayload,
): Promise<ActionResult<{ id?: number }>> {
  try {
    const result = await brands_repository.create_brand(payload);
    revalidateTag(brands_tags.list());
    if (result.id) {
      revalidate_brand_tag(result.id);
    }
    return { success: true, data: { id: result.id } };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function update_brand_action(
  payload: UpdateBrandPayload,
): Promise<ActionResult> {
  try {
    const result = await brands_repository.update_brand(payload);
    revalidate_brand_tag(result.id ?? payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function delete_brand_action(
  payload: DeleteBrandPayload,
): Promise<ActionResult> {
  try {
    await brands_repository.delete_brand(payload);
    revalidate_brand_tag(payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

// ─── Lote y exportación ──────────────────────────────────────────────────────

export async function bulk_delete_brands_action(
  ids: number[],
): Promise<ActionResult<BulkResult>> {
  try {
    const result = await brands_resource.bulk_delete(ids);
    revalidateTag(brands_tags.list());
    for (const id of ids) revalidateTag(brands_tags.item(id));
    return { success: true, data: result };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function export_brands_action(
  query: GridQuery,
): Promise<ActionResult<{ items: BrandDto[]; truncated: boolean }>> {
  try {
    return { success: true, data: await brands_resource.export_all(query) };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
