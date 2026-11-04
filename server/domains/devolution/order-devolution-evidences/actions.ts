'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { order_devolution_evidences_repository } from './repository';
import type {
  CreateOrderDevolutionEvidenceDto,
  UpdateOrderDevolutionEvidencePayload,
  DeleteOrderDevolutionEvidencePayload,
} from './types';
import { order_devolution_evidences_tags } from '@/server/lib/cache-tags';
import { ServerApiError } from '@/server/lib/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; status?: number };

function handle_error(error: unknown): ActionResult<never> {
  if (error instanceof ServerApiError) {
    return { success: false, error: error.message, status: error.status };
  }
  const message = error instanceof Error ? error.message : 'Unexpected error';
  return { success: false, error: message };
}

function revalidate_order_devolution_evidence_tags(id?: number) {
  revalidateTag(order_devolution_evidences_tags.list());
  if (typeof id === 'number') {
    revalidateTag(order_devolution_evidences_tags.item(id));
  }
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function create_order_devolution_evidence_action(
  payload: CreateOrderDevolutionEvidenceDto,
): Promise<ActionResult<{ id?: number }>> {
  try {
    const result = await order_devolution_evidences_repository.create_order_devolution_evidence(
      payload,
    );
    revalidate_order_devolution_evidence_tags(result.id);
    return { success: true, data: { id: result.id } };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function update_order_devolution_evidence_action(
  payload: UpdateOrderDevolutionEvidencePayload,
): Promise<ActionResult> {
  try {
    const result = await order_devolution_evidences_repository.update_order_devolution_evidence(
      payload,
    );
    revalidate_order_devolution_evidence_tags(result.id ?? payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function delete_order_devolution_evidence_action(
  payload: DeleteOrderDevolutionEvidencePayload,
): Promise<ActionResult> {
  try {
    await order_devolution_evidences_repository.delete_order_devolution_evidence(payload);
    revalidate_order_devolution_evidence_tags(payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
