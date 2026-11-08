'use server';

import { unstable_rethrow } from 'next/navigation';

import { purchase_orders_repository } from './repository';
import type { PurchaseOrderDetailDto, SavePurchaseOrderRequest, SupplierProductDto } from './types';
import { field_errors_from } from '@/server/lib/pagination';
import { ServerApiError } from '@/server/lib/types';

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; status?: number; field_errors?: Record<string, string> };

async function run<T>(operation: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { success: true, data: await operation() };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ServerApiError) {
      return { success: false, error: error.message, status: error.status, field_errors: field_errors_from(error) };
    }
    return { success: false, error: error instanceof Error ? error.message : 'Unexpected error' };
  }
}

export async function save_purchase_order_action(id: number | null, payload: SavePurchaseOrderRequest): Promise<ActionResult<PurchaseOrderDetailDto>> {
  return run(() => (id == null ? purchase_orders_repository.create(payload) : purchase_orders_repository.update(id, payload)));
}

export async function purchase_order_command_action(id: number, command: 'send' | 'cancel' | 'close', reason: string | null,
  lock_version: number): Promise<ActionResult<PurchaseOrderDetailDto>> {
  return run(() => purchase_orders_repository.command(id, command, reason, lock_version));
}

export async function receive_purchase_order_action(id: number, payload: { reference?: string | null; notes?: string | null;
  lines: { line_id: number; quantity: number }[]; lock_version: number }): Promise<ActionResult<PurchaseOrderDetailDto>> {
  return run(() => purchase_orders_repository.receive(id, payload));
}

export async function supplier_products_action(supplierId: number): Promise<ActionResult<SupplierProductDto[]>> {
  return run(() => purchase_orders_repository.supplier_products(supplierId));
}
