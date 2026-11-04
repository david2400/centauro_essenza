'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { dispatch_products_repository } from './repository';
import { dispatch_products_resource } from './search';
import type { DispatchProductDto } from './types';
import type { BulkResult, GridQuery } from '@/shared/models/pagination';
import type {
  CreateDispatchProductDto,
  UpdateDispatchProductPayload,
  DeleteDispatchProductPayload,
  DispatchProductShippingEstimateQuery,
  DispatchProductShippingEstimateDto,
} from './types';
import { dispatch_products_tags } from '@/server/lib/cache-tags';
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

function revalidate_dispatch_product_tags(id?: number) {
  revalidateTag(dispatch_products_tags.list());
  if (typeof id === 'number') {
    revalidateTag(dispatch_products_tags.item(id));
  }
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function create_dispatch_product_action(
  payload: CreateDispatchProductDto,
): Promise<ActionResult<{ id?: number }>> {
  try {
    const result = await dispatch_products_repository.create_dispatch_product(payload);
    revalidate_dispatch_product_tags(result.id);
    return { success: true, data: { id: result.id } };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function update_dispatch_product_action(
  payload: UpdateDispatchProductPayload,
): Promise<ActionResult> {
  try {
    const result = await dispatch_products_repository.update_dispatch_product(payload);
    revalidate_dispatch_product_tags(result.id ?? payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function delete_dispatch_product_action(
  payload: DeleteDispatchProductPayload,
): Promise<ActionResult> {
  try {
    await dispatch_products_repository.delete_dispatch_product(payload);
    revalidate_dispatch_product_tags(payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function fetch_dispatch_product_shipping_estimate_action(
  query: DispatchProductShippingEstimateQuery,
): Promise<ActionResult<{ estimate: DispatchProductShippingEstimateDto }>> {
  try {
    const estimate = await dispatch_products_repository.fetch_dispatch_product_shipping_estimate(query);
    return { success: true, data: { estimate } };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

// ─── Lote y exportación ──────────────────────────────────────────────────────

export async function bulk_delete_dispatch_products_action(ids: number[]): Promise<ActionResult<BulkResult>> {
  try {
    const result = await dispatch_products_resource.bulk_delete(ids);
    revalidateTag(dispatch_products_tags.list());
    for (const id of ids) revalidateTag(dispatch_products_tags.item(id));
    return { success: true, data: result };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function export_dispatch_products_action(
  query: GridQuery,
): Promise<ActionResult<{ items: DispatchProductDto[]; truncated: boolean }>> {
  try {
    return { success: true, data: await dispatch_products_resource.export_all(query) };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
