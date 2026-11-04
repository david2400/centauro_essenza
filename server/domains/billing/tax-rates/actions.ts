'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { tax_rates_repository } from './repository';
import type { SaveTaxRateDto, TaxRateDto } from './types';
import { billing_tags } from '@/server/lib/cache-tags';
import { field_errors_from } from '@/server/lib/pagination';
import { ServerApiError } from '@/server/lib/types';

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; status?: number; fieldErrors?: Record<string, string> };

function handle_error(error: unknown): ActionResult<never> {
  if (error instanceof ServerApiError) {
    return { success: false, error: error.message, status: error.status, fieldErrors: field_errors_from(error) };
  }
  return { success: false, error: error instanceof Error ? error.message : 'Unexpected error' };
}

export async function create_tax_rate_action(payload: SaveTaxRateDto): Promise<ActionResult<TaxRateDto>> {
  try {
    const data = await tax_rates_repository.create_tax_rate(payload);
    revalidateTag(billing_tags.tax_rates());
    return { success: true, data };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function update_tax_rate_action(id: number, payload: SaveTaxRateDto): Promise<ActionResult<TaxRateDto>> {
  try {
    const data = await tax_rates_repository.update_tax_rate(id, payload);
    revalidateTag(billing_tags.tax_rates());
    return { success: true, data };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function delete_tax_rate_action(id: number): Promise<ActionResult> {
  try {
    await tax_rates_repository.delete_tax_rate(id);
    revalidateTag(billing_tags.tax_rates());
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
