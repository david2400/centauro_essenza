'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { payments_repository } from './repository';
import type {
  CheckoutDto,
  PaymentAction,
  PaymentActionDto,
  PaymentDto,
  PaymentEventDto,
  RegisterPaymentDto,
  RegisterSplitPaymentDto,
  StartCheckoutDto,
} from './types';
import { orders_tags, payments_tags } from '@/server/lib/cache-tags';
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

/** Un pago puede marcar la orden como pagada (stock descontado): se refrescan pagos y órdenes. */
function revalidate(order_id?: number | null) {
  revalidateTag(payments_tags.all());
  if (order_id != null) {
    revalidateTag(payments_tags.order(order_id));
    revalidateTag(orders_tags.item(order_id));
  }
  revalidateTag(orders_tags.list());
}

export async function register_payment_action(payload: RegisterPaymentDto): Promise<ActionResult<PaymentDto>> {
  try {
    const result = await payments_repository.register_payment(payload);
    revalidate(payload.order_id);
    return { success: true, data: result };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function register_split_payment_action(payload: RegisterSplitPaymentDto): Promise<ActionResult<PaymentDto[]>> {
  try {
    const result = await payments_repository.register_split_payment(payload);
    revalidate(payload.order_id);
    return { success: true, data: result };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function start_checkout_action(payload: StartCheckoutDto): Promise<ActionResult<CheckoutDto>> {
  try {
    const result = await payments_repository.start_checkout(payload);
    revalidate(payload.order_id);
    return { success: true, data: result };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function run_payment_action(
  id: number,
  action: PaymentAction,
  payload?: PaymentActionDto,
): Promise<ActionResult<PaymentDto>> {
  try {
    const result = await payments_repository.run_action(id, action, payload);
    revalidate(result.order_id);
    return { success: true, data: result };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function get_payment_events_action(id: number): Promise<ActionResult<PaymentEventDto[]>> {
  try {
    return { success: true, data: await payments_repository.get_payment_events(id) };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
