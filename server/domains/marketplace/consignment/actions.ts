'use server';

import { unstable_rethrow } from 'next/navigation';

import { consignment_repository } from './repository';
import type { ConsignmentAdjustmentRequest, ConsignmentDocumentDto, SaveConsignmentDocumentRequest } from './types';
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

/** Recepción o devolución al vendedor (draco exige CONSIGNACION.GESTIONAR). */
export async function save_consignment_document_action(
  payload: SaveConsignmentDocumentRequest,
): Promise<ActionResult<ConsignmentDocumentDto>> {
  return run(() => consignment_repository.save_document(payload));
}

/** Conteo físico de un SKU del vendedor en una bodega. */
export async function adjust_consignment_action(
  payload: ConsignmentAdjustmentRequest,
): Promise<ActionResult<ConsignmentDocumentDto>> {
  return run(() => consignment_repository.adjust(payload));
}
