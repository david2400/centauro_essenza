'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { product_attributes_repository } from './repository';
import type { ProductAttributesDto, SaveProductAttributesDto } from './types';
import { attributes_tags, product_attributes_tags, product_templates_tags } from '@/server/lib/cache-tags';
import { ServerApiError } from '@/server/lib/types';

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

export async function get_product_attributes_action(product_id: number): Promise<ActionResult<ProductAttributesDto>> {
  try {
    return { success: true, data: await product_attributes_repository.get_product_attributes(product_id) };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function save_product_attributes_action(
  product_id: number,
  payload: SaveProductAttributesDto,
): Promise<ActionResult<ProductAttributesDto>> {
  try {
    const data = await product_attributes_repository.save_product_attributes(product_id, payload);
    revalidateTag(product_attributes_tags.item(product_id));
    // "En uso" de atributos y conteo de productos por plantilla cambian.
    revalidateTag(attributes_tags.list());
    revalidateTag(product_templates_tags.list());
    return { success: true, data };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
