'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { attributes_repository } from './repository';
import type { AttributeDto, SaveAttributeDto, UpdateAttributePayload } from './types';
import { attributes_tags, product_attributes_tags } from '@/server/lib/cache-tags';
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
  revalidateTag(attributes_tags.list());
  if (id != null) revalidateTag(attributes_tags.item(id));
  // La ficha técnica de los productos muestra atributos y plantillas.
  revalidateTag(product_attributes_tags.all());
}

/** Catálogo de atributos actualizado (sin caché), p. ej. para añadirlos a la ficha técnica. */
export async function list_attributes_fresh_action(): Promise<ActionResult<AttributeDto[]>> {
  try {
    return { success: true, data: await attributes_repository.list_attributes_fresh() };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function create_attribute_action(payload: SaveAttributeDto): Promise<ActionResult<{ id: number }>> {
  try {
    const result = await attributes_repository.create_attribute(payload);
    if (typeof result.id !== 'number') {
      return { success: false, error: 'attribute_id_not_returned' };
    }
    revalidate(result.id);
    return { success: true, data: { id: result.id } };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function update_attribute_action(payload: UpdateAttributePayload): Promise<ActionResult> {
  try {
    await attributes_repository.update_attribute(payload);
    revalidate(payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function delete_attribute_action(id: number): Promise<ActionResult> {
  try {
    await attributes_repository.delete_attribute(id);
    revalidate(id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
