'use server';

import {
  get_payment_events_action,
  register_payment_action,
  register_split_payment_action,
  run_payment_action,
  start_checkout_action,
} from '@/server/domains/sales/payments/actions';
import type {
  CheckoutDto,
  PaymentAction,
  PaymentActionDto,
  PaymentDto,
  PaymentEventDto,
  RegisterPaymentDto,
  RegisterSplitPaymentDto,
  StartCheckoutDto,
} from '@/server/domains/sales/payments/types';

/**
 * Server actions de pagos (detalle de la orden y listado). Devuelven el resultado
 * en lugar de lanzar para que la UI muestre el motivo real (saldo, referencia, pasarela…).
 */
type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string };

const fail = (result: { error?: string }, fallback: string): ActionResult<never> => ({
  success: false,
  error: result.error ?? fallback,
});

export async function registerPaymentServerAction(payload: RegisterPaymentDto): Promise<ActionResult<PaymentDto>> {
  const result = await register_payment_action(payload);
  return result.success ? { success: true, data: result.data } : fail(result, 'No se pudo registrar el pago');
}

export async function registerSplitPaymentServerAction(payload: RegisterSplitPaymentDto): Promise<ActionResult<PaymentDto[]>> {
  const result = await register_split_payment_action(payload);
  return result.success ? { success: true, data: result.data } : fail(result, 'No se pudieron registrar los pagos');
}

export async function startCheckoutServerAction(payload: StartCheckoutDto): Promise<ActionResult<CheckoutDto>> {
  const result = await start_checkout_action(payload);
  return result.success ? { success: true, data: result.data } : fail(result, 'No se pudo generar el link de pago');
}

export async function runPaymentActionServerAction(
  id: number,
  action: PaymentAction,
  payload?: PaymentActionDto,
): Promise<ActionResult<PaymentDto>> {
  const result = await run_payment_action(id, action, payload);
  return result.success ? { success: true, data: result.data } : fail(result, 'No se pudo actualizar el pago');
}

export async function getPaymentEventsServerAction(id: number): Promise<ActionResult<PaymentEventDto[]>> {
  const result = await get_payment_events_action(id);
  return result.success ? { success: true, data: result.data } : fail(result, 'No se pudo cargar el historial');
}
