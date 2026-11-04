'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { warehouses_repository } from './repository';
import { warehouses_resource } from './search';
import type {
  SaveLocationDto,
  SaveWarehouseDto,
  UpdateWarehousePayload,
  WarehouseDto,
  WarehouseLocationDto,
  WarehouseStockDto,
} from './types';
import { warehouses_tags } from '@/server/lib/cache-tags';
import { field_errors_from } from '@/server/lib/pagination';
import { ServerApiError } from '@/server/lib/types';
import type { BulkResult, GridQuery } from '@/shared/models/pagination';

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; status?: number; field_errors?: Record<string, string> };

function handle_error(error: unknown): ActionResult<never> {
  if (error instanceof ServerApiError) {
    return { success: false, error: error.message, status: error.status, field_errors: field_errors_from(error) };
  }
  return { success: false, error: error instanceof Error ? error.message : 'Unexpected error' };
}

/** Cambiar una bodega afecta el listado, su ficha y la principal (otra ficha). */
function revalidate(id?: number) {
  revalidateTag(warehouses_tags.list());
  if (id != null) revalidateTag(warehouses_tags.item(id));
}

async function run<T>(id: number | undefined, task: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await task();
    revalidate(id);
    return { success: true, data };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function create_warehouse_action(payload: SaveWarehouseDto): Promise<ActionResult<WarehouseDto>> {
  return run(undefined, () => warehouses_repository.create_warehouse(payload));
}

export async function update_warehouse_action(payload: UpdateWarehousePayload): Promise<ActionResult<WarehouseDto>> {
  return run(payload.id, () => warehouses_repository.update_warehouse(payload));
}

export async function set_warehouse_active_action(id: number, active: boolean): Promise<ActionResult<WarehouseDto>> {
  return run(id, () => warehouses_repository.set_active(id, active));
}

export async function set_main_warehouse_action(id: number): Promise<ActionResult<WarehouseDto>> {
  const result = await run(id, () => warehouses_repository.set_main(id));
  // La anterior principal también cambió: se refrescan todas las fichas.
  if (result.success) revalidateTag(warehouses_tags.list());
  return result;
}

export async function delete_warehouse_action(id: number): Promise<ActionResult> {
  return run(id, () => warehouses_repository.delete_warehouse(id));
}

export async function bulk_delete_warehouses_action(ids: number[]): Promise<ActionResult<BulkResult>> {
  try {
    const result = await warehouses_resource.bulk_delete(ids);
    revalidate();
    for (const id of ids) revalidateTag(warehouses_tags.item(id));
    return { success: true, data: result };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function export_warehouses_action(
  query: GridQuery,
): Promise<ActionResult<{ items: WarehouseDto[]; truncated: boolean }>> {
  try {
    return { success: true, data: await warehouses_resource.export_all(query) };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function update_min_threshold_action(
  id: number,
  sku_id: number,
  min_threshold: number,
): Promise<ActionResult<WarehouseStockDto>> {
  return run(id, () => warehouses_repository.update_min(id, sku_id, min_threshold));
}

export async function save_location_action(
  id: number,
  location_id: number | null,
  payload: SaveLocationDto,
): Promise<ActionResult<WarehouseLocationDto>> {
  return run(id, () => warehouses_repository.save_location(id, location_id, payload));
}

export async function delete_location_action(id: number, location_id: number): Promise<ActionResult> {
  return run(id, () => warehouses_repository.delete_location(id, location_id));
}
