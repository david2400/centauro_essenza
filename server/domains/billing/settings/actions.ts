'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { billing_settings_repository } from './repository';
import type { BillingSettingsDto, SaveBillingSettingsDto } from './types';
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

export async function update_billing_settings_action(payload: SaveBillingSettingsDto): Promise<ActionResult<BillingSettingsDto>> {
  try {
    const data = await billing_settings_repository.update_billing_settings(payload);
    revalidateTag(billing_tags.settings());
    return { success: true, data };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
