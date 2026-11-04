'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { suppliers_repository } from './repository';
import { suppliers_resource } from './search';
import type {
  ChangeSupplierStatusDto,
  DeleteSupplierPayload,
  SaveSupplierDto,
  SaveSupplierProductDto,
  SupplierDto,
  SupplierProductDto,
  UpdateSupplierPayload,
} from './types';
import { suppliers_tags } from '@/server/lib/cache-tags';
import { field_errors_from } from '@/server/lib/pagination';
import { ServerApiError } from '@/server/lib/types';
import type { BulkResult, GridQuery } from '@/shared/models/pagination';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; status?: number; field_errors?: Record<string, string> };

function handle_error(error: unknown): ActionResult<never> {
  if (error instanceof ServerApiError) {
    return { success: false, error: error.message, status: error.status, field_errors: field_errors_from(error) };
  }
  const message = error instanceof Error ? error.message : 'Unexpected error';
  return { success: false, error: message };
}

function revalidate_supplier_tags(id: number) {
  revalidateTag(suppliers_tags.list());
  revalidateTag(suppliers_tags.item(id));
}

// ─── Ficha ───────────────────────────────────────────────────────────────────

export async function create_supplier_action(payload: SaveSupplierDto): Promise<ActionResult<SupplierDto>> {
  try {
    const result = await suppliers_repository.create_supplier(payload);
    if (typeof result.id === 'number') revalidate_supplier_tags(result.id);
    else revalidateTag(suppliers_tags.list());
    return { success: true, data: result };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function update_supplier_action(payload: UpdateSupplierPayload): Promise<ActionResult<SupplierDto>> {
  try {
    const result = await suppliers_repository.update_supplier(payload);
    revalidate_supplier_tags(payload.id);
    return { success: true, data: result };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function change_supplier_status_action(
  id: number,
  payload: ChangeSupplierStatusDto,
): Promise<ActionResult<SupplierDto>> {
  try {
    const result = await suppliers_repository.change_status(id, payload);
    revalidate_supplier_tags(id);
    return { success: true, data: result };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function delete_supplier_action(payload: DeleteSupplierPayload): Promise<ActionResult> {
  try {
    await suppliers_repository.delete_supplier(payload);
    revalidate_supplier_tags(payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

// ─── Lote y exportación ──────────────────────────────────────────────────────

export async function bulk_delete_suppliers_action(ids: number[]): Promise<ActionResult<BulkResult>> {
  try {
    const result = await suppliers_resource.bulk_delete(ids);
    revalidateTag(suppliers_tags.list());
    for (const id of ids) revalidateTag(suppliers_tags.item(id));
    return { success: true, data: result };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function export_suppliers_action(
  query: GridQuery,
): Promise<ActionResult<{ items: SupplierDto[]; truncated: boolean }>> {
  try {
    return { success: true, data: await suppliers_resource.export_all(query) };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

// ─── Productos que surte ─────────────────────────────────────────────────────

export async function save_supplier_product_action(
  supplier_id: number,
  product_id: number | null,
  payload: SaveSupplierProductDto,
): Promise<ActionResult<SupplierProductDto>> {
  try {
    const result = await suppliers_repository.save_product(supplier_id, product_id, payload);
    revalidate_supplier_tags(supplier_id);
    return { success: true, data: result };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function delete_supplier_product_action(supplier_id: number, product_id: number): Promise<ActionResult> {
  try {
    await suppliers_repository.delete_product(supplier_id, product_id);
    revalidate_supplier_tags(supplier_id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
