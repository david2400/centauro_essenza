'use server';

import { unstable_rethrow } from 'next/navigation';

import { purchases_repository } from './repository';
import type { CreatePurchaseRequest, PurchaseDetailDto, SkuOptionsDto } from './types';
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

export async function create_purchase_action(payload: CreatePurchaseRequest): Promise<ActionResult<PurchaseDetailDto>> {
  return run(() => purchases_repository.create(payload));
}

export async function sku_options_action(sku_id: number): Promise<ActionResult<SkuOptionsDto>> {
  return run(() => purchases_repository.sku_options(sku_id));
}
