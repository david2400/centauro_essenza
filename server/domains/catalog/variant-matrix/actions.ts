'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { variant_matrix_repository } from './repository';
import type { CreateAxisOptionDto, SaveVariantMatrixDto, SaveVariantMatrixResultDto, VariantMatrixOption } from './types';
import {
  attributes_tags,
  product_attributes_tags,
  product_children_tags,
  products_tags,
  stock_tags,
} from '@/server/lib/cache-tags';
import { ServerApiError } from '@/server/lib/types';

type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string; status?: number };

function handle_error(error: unknown): ActionResult<never> {
  if (error instanceof ServerApiError) return { success: false, error: error.message, status: error.status };
  return { success: false, error: error instanceof Error ? error.message : 'Unexpected error' };
}

/** Guardar la matriz cambia variantes, SKU, stock, ficha técnica y (si hubo valores nuevos) atributos. */
function revalidate(product_id: number) {
  revalidateTag(products_tags.list());
  revalidateTag(products_tags.item(product_id));
  revalidateTag(product_children_tags.list());
  revalidateTag(product_attributes_tags.item(product_id));
  revalidateTag(stock_tags.all());
  revalidateTag(attributes_tags.list());
}

export async function save_variant_matrix_action(
  product_id: number,
  payload: SaveVariantMatrixDto,
): Promise<ActionResult<SaveVariantMatrixResultDto>> {
  try {
    const data = await variant_matrix_repository.save(product_id, payload);
    revalidate(product_id);
    return { success: true, data };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function create_axis_option_action(
  product_id: number,
  payload: CreateAxisOptionDto,
): Promise<ActionResult<VariantMatrixOption>> {
  try {
    const data = await variant_matrix_repository.create_option(product_id, payload);
    revalidateTag(attributes_tags.list());
    return { success: true, data };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
