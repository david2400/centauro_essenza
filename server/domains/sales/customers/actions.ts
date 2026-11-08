'use server';

import { unstable_rethrow } from 'next/navigation';

import { customers_repository } from './repository';
import type { CustomerDetailDto, SaveCustomerRequest } from './types';
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

export async function create_customer_action(payload: SaveCustomerRequest): Promise<ActionResult<CustomerDetailDto>> {
  return run(() => customers_repository.create(payload));
}

export async function update_customer_action(id: number, payload: SaveCustomerRequest): Promise<ActionResult<CustomerDetailDto>> {
  return run(() => customers_repository.update(id, payload));
}

export async function import_customers_action(): Promise<ActionResult<{ created: number }>> {
  return run(() => customers_repository.import_from_orders());
}
