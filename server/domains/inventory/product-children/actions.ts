'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { product_children_repository } from './repository';
import { list_product_children } from './queries';
import { create_search_resource } from '@/server/lib/search-resource';
import type { BulkResult } from '@/shared/models/pagination';
import type { ProductChildDto } from './types';
import type {
  CreateProductChildDto,
  UpdateProductChildPayload,
  DeleteProductChildPayload,
} from './types';
import { product_children_tags, products_tags, stock_tags } from '@/server/lib/cache-tags';
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

/** Cambian los SKUs, el stock o los componentes del producto: también su ficha y listados. */
function revalidate_product_child_tags(id?: number) {
  revalidateTag(product_children_tags.list());
  revalidateTag(products_tags.list());
  revalidateTag(stock_tags.all());
  if (typeof id === 'number') {
    revalidateTag(product_children_tags.item(id));
  }
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function create_product_child_action(
  payload: CreateProductChildDto,
): Promise<ActionResult<{ id?: number }>> {
  try {
    const result = await product_children_repository.create_product_child(payload);
    revalidate_product_child_tags(result.id);
    return { success: true, data: { id: result.id } };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function update_product_child_action(
  payload: UpdateProductChildPayload,
): Promise<ActionResult> {
  try {
    const result = await product_children_repository.update_product_child(payload);
    revalidate_product_child_tags(result.id ?? payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function delete_product_child_action(
  payload: DeleteProductChildPayload,
): Promise<ActionResult> {
  try {
    await product_children_repository.delete_product_child(payload);
    revalidate_product_child_tags(payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

/** Borrado en lote: `POST /bulk-delete` o, si el backend aún no lo tiene, uno a uno. */
export async function bulk_delete_product_children_action(ids: number[]): Promise<ActionResult<BulkResult>> {
  try {
    const resource = create_search_resource<ProductChildDto>({
      base_path: '/api/shop/catalog/variants',
      list_tag: product_children_tags.list(),
      list_all: () => list_product_children(),
      delete_one: (id) => product_children_repository.delete_product_child({ id }),
      search_fields: (item) => [item.name, item.description],
    });
    const result = await resource.bulk_delete(ids);
    revalidate_product_child_tags();
    return { success: true, data: result };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
