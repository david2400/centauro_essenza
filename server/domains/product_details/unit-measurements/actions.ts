'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { units_repository } from './repository';
import type { SaveUnitDto, UnitDto, UpdateUnitPayload } from './types';
import { products_tags, unit_measurements_tags, attributes_tags } from '@/server/lib/cache-tags';
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

/** Cambiar una unidad afecta a su lista, a los atributos que la muestran y a los productos. */
function revalidate_units(id?: number) {
  revalidateTag(unit_measurements_tags.list());
  if (id != null) revalidateTag(unit_measurements_tags.item(id));
  revalidateTag(attributes_tags.list());
  revalidateTag(products_tags.list());
}

export async function create_unit_action(payload: SaveUnitDto): Promise<ActionResult<UnitDto>> {
  try {
    const unit = await units_repository.create_unit(payload);
    revalidate_units(unit.id);
    return { success: true, data: unit };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function update_unit_action(payload: UpdateUnitPayload): Promise<ActionResult<UnitDto>> {
  try {
    const unit = await units_repository.update_unit(payload);
    revalidate_units(payload.id);
    return { success: true, data: unit };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function delete_unit_action(id: number): Promise<ActionResult> {
  try {
    await units_repository.delete_unit(id);
    revalidate_units(id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
