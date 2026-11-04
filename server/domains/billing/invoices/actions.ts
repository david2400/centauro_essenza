'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { invoices_repository } from './repository';
import type { CreditNoteDto, InvoiceDto, IssueInvoiceDto } from './types';
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

function revalidate(order_id?: number | null) {
  revalidateTag(billing_tags.invoices());
  revalidateTag(billing_tags.resolutions());
  if (order_id != null) revalidateTag(billing_tags.order_invoices(order_id));
}

export async function issue_invoice_action(payload: IssueInvoiceDto): Promise<ActionResult<InvoiceDto>> {
  try {
    const data = await invoices_repository.issue_invoice(payload);
    revalidate(payload.order_id);
    return { success: true, data };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function retry_invoice_action(id: number): Promise<ActionResult<InvoiceDto>> {
  try {
    const data = await invoices_repository.retry_invoice(id);
    revalidate(data.order_id);
    return { success: true, data };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function credit_note_action(id: number, payload: CreditNoteDto): Promise<ActionResult<InvoiceDto>> {
  try {
    const data = await invoices_repository.credit_note(id, payload);
    revalidate(data.order_id);
    return { success: true, data };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

/** Documentos de una orden (p. ej. la factura automática de una venta de mostrador). */
export async function get_order_invoices_action(order_id: number): Promise<ActionResult<InvoiceDto[]>> {
  try {
    return { success: true, data: await invoices_repository.get_order_invoices(order_id) };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
