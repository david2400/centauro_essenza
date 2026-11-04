'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { products_repository } from './repository';
import { products_resource } from './search';
import type { BulkResult, GridQuery } from '@/shared/models/pagination';
import type {
  ProductDto,
  CreateProductDto,
  UpdateProductPayload,
  DeleteProductPayload,
  ProductSearchParams,
  ProductImageDto,
  ReplaceProductImagesPayload,
} from './types';
import { products_tags } from '@/server/lib/cache-tags';
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

function revalidate_product_tags(id?: number) {
  revalidateTag(products_tags.list());
  if (typeof id === 'number') {
    revalidateTag(products_tags.item(id));
  }
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function create_product_action(
  payload: CreateProductDto,
): Promise<ActionResult<{ id?: number }>> {
  try {
    const result = await products_repository.create_product(payload);
    revalidate_product_tags(result.id);
    return { success: true, data: { id: result.id } };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function update_product_action(
  payload: UpdateProductPayload,
): Promise<ActionResult> {
  try {
    const result = await products_repository.update_product(payload);
    revalidate_product_tags(result.id ?? payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function replace_product_images_action(
  payload: ReplaceProductImagesPayload,
): Promise<ActionResult<ProductImageDto[]>> {
  try {
    const images = await products_repository.replace_product_images(payload);
    revalidate_product_tags(payload.id);
    return { success: true, data: images };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function delete_product_action(
  payload: DeleteProductPayload,
): Promise<ActionResult> {
  try {
    await products_repository.delete_product(payload);
    revalidate_product_tags(payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function search_products_action(
  payload: ProductSearchParams,
): Promise<ActionResult<{ results: Awaited<ReturnType<typeof products_repository.search_products>> }>> {
  try {
    const results = await products_repository.search_products(payload);
    return { success: true, data: { results } };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

// ─── Lote y exportación ──────────────────────────────────────────────────────

function revalidate_many(ids: number[]) {
  revalidateTag(products_tags.list());
  for (const id of ids) revalidateTag(products_tags.item(id));
}

export async function bulk_delete_products_action(ids: number[]): Promise<ActionResult<BulkResult>> {
  try {
    const result = await products_resource.bulk_delete(ids);
    revalidate_many(ids);
    return { success: true, data: result };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function bulk_set_products_availability_action(
  ids: number[],
  available: boolean,
): Promise<ActionResult<BulkResult>> {
  try {
    const result = await products_resource.set_availability(ids, available);
    revalidate_many(ids);
    return { success: true, data: result };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function export_products_action(
  query: GridQuery,
): Promise<ActionResult<{ items: ProductDto[]; truncated: boolean }>> {
  try {
    return { success: true, data: await products_resource.export_all(query) };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
