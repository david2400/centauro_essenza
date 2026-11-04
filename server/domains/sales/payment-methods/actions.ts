'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { payment_methods_repository } from './repository';
import type { SavePaymentMethodDto, UpdatePaymentMethodPayload } from './types';
import { payment_methods_tags, payments_tags } from '@/server/lib/cache-tags';
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

function revalidate(id?: number) {
  revalidateTag(payment_methods_tags.list());
  if (id != null) revalidateTag(payment_methods_tags.item(id));
  revalidateTag(payments_tags.all());
}

export async function create_payment_method_action(payload: SavePaymentMethodDto): Promise<ActionResult<{ id?: number }>> {
  try {
    const result = await payment_methods_repository.create_payment_method(payload);
    revalidate(result.id);
    return { success: true, data: { id: result.id } };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function update_payment_method_action(payload: UpdatePaymentMethodPayload): Promise<ActionResult> {
  try {
    await payment_methods_repository.update_payment_method(payload);
    revalidate(payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function delete_payment_method_action(id: number): Promise<ActionResult> {
  try {
    await payment_methods_repository.delete_payment_method(id);
    revalidate(id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
