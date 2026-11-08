'use server';

import { unstable_rethrow } from 'next/navigation';

import { disputes_repository } from './repository';
import type { DisputeDetailDto, OpenDisputeRequest, ResolveDisputeRequest } from './types';
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

export async function open_dispute_action(payload: OpenDisputeRequest): Promise<ActionResult<DisputeDetailDto>> {
  return run(() => disputes_repository.open(payload));
}

export async function respond_dispute_action(id: number, response: string, lock_version: number): Promise<ActionResult<DisputeDetailDto>> {
  return run(() => disputes_repository.respond(id, response, lock_version));
}

export async function resolve_dispute_action(id: number, payload: ResolveDisputeRequest): Promise<ActionResult<DisputeDetailDto>> {
  return run(() => disputes_repository.resolve(id, payload));
}

export async function cancel_dispute_action(id: number, reason: string, lock_version: number): Promise<ActionResult<DisputeDetailDto>> {
  return run(() => disputes_repository.cancel(id, reason, lock_version));
}
