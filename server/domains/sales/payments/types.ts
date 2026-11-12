import 'server-only';

import type { components } from '@/server/lib/essenza-openapi-types';

export type PaymentDto = components['schemas']['PaymentDto'];
export type PaymentEventDto = components['schemas']['PaymentEventDto'];
export type OrderPaymentsDto = components['schemas']['OrderPaymentsDto'];
export type PaymentsSummaryDto = components['schemas']['PaymentsSummaryDto'];
export type RegisterPaymentDto = components['schemas']['RegisterPaymentDto'];
/** Cobro con varios medios (POST /sales/payments/split); todo o nada en el backend. */
export interface RegisterSplitPaymentLineDto {
  payment_method_id: number;
  amount: number;
  tendered_amount?: number;
  reference?: string;
  pending?: boolean;
}
export interface RegisterSplitPaymentDto {
  order_id: number;
  lines: RegisterSplitPaymentLineDto[];
  notes?: string;
  cash_session_id?: number;
}
export type StartCheckoutDto = components['schemas']['StartCheckoutDto'];
export type CheckoutDto = components['schemas']['CheckoutDto'];
export type PaymentActionDto = components['schemas']['PaymentActionDto'];

export type PaymentAction = 'confirm' | 'decline' | 'void' | 'refund' | 'sync';
