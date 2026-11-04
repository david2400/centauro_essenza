'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { product_templates_repository } from './repository';
import type { SaveProductTemplateDto, UpdateProductTemplatePayload } from './types';
import { product_templates_tags, product_attributes_tags } from '@/server/lib/cache-tags';
import { field_errors_from } from '@/server/lib/pagination';
import { ServerApiError } from '@/server/lib/types';

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; status?: number; fieldErrors?: Record<string, string> };

function handle_error(error: unknown): ActionResult<never> {
  if (error instanceof ServerApiError) {
    return { success: false, error: error.message, status: error.status, fieldErrors: field_errors_from(error) };
  }
  const message = error instanceof Error ? error.message : 'Unexpected error';
  return { success: false, error: message };
}

function revalidate(id?: number) {
  revalidateTag(product_templates_tags.list());
  if (id != null) revalidateTag(product_templates_tags.item(id));
  // La ficha técnica de los productos muestra atributos y plantillas.
  revalidateTag(product_attributes_tags.all());
}

export async function create_product_template_action(payload: SaveProductTemplateDto): Promise<ActionResult<{ id: number }>> {
  try {
    const result = await product_templates_repository.create_product_template(payload);
    if (typeof result.id !== 'number') {
      return { success: false, error: 'product_template_id_not_returned' };
    }
    revalidate(result.id);
    return { success: true, data: { id: result.id } };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function update_product_template_action(payload: UpdateProductTemplatePayload): Promise<ActionResult> {
  try {
    await product_templates_repository.update_product_template(payload);
    revalidate(payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function delete_product_template_action(id: number): Promise<ActionResult> {
  try {
    await product_templates_repository.delete_product_template(id);
    revalidate(id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
