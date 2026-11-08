'use server';

import { unstable_rethrow } from 'next/navigation';

import { dispatch_repository } from './repository';
import { ServerApiError } from '@/server/lib/types';

type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string; status?: number };

/** Calcula la fecha límite de las órdenes abiertas que no la tienen (draco exige VENTAS.GESTIONAR). */
export async function backfill_dispatch_action(): Promise<ActionResult<{ updated: number }>> {
  try {
    return { success: true, data: await dispatch_repository.backfill() };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ServerApiError) return { success: false, error: error.message, status: error.status };
    return { success: false, error: error instanceof Error ? error.message : 'Unexpected error' };
  }
}
