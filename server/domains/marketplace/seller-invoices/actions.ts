'use server';

import { unstable_rethrow } from 'next/navigation';

import { seller_invoices_repository } from './repository';
import type { SellerInvoiceIssueResultDto } from './types';
import { ServerApiError } from '@/server/lib/types';

type ActionResult<T> = { success: true; data: T } | { success: false; error: string; status?: number };

/** Emite la factura del mes (draco exige COMISIONES.GESTIONAR y un mes cerrado). */
export async function issue_seller_invoices_action(period: string, seller_ids: number[] | null): Promise<ActionResult<SellerInvoiceIssueResultDto>> {
  try {
    return { success: true, data: await seller_invoices_repository.issue(period, seller_ids) };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ServerApiError) return { success: false, error: error.message, status: error.status };
    return { success: false, error: error instanceof Error ? error.message : 'Unexpected error' };
  }
}
