'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { resolutions_repository } from './repository';
import type { ResolutionDto, SaveResolutionDto } from './types';
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

export async function create_resolution_action(payload: SaveResolutionDto): Promise<ActionResult<ResolutionDto>> {
  try {
    const data = await resolutions_repository.create_resolution(payload);
    revalidateTag(billing_tags.resolutions());
    return { success: true, data };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function update_resolution_action(id: number, payload: SaveResolutionDto): Promise<ActionResult<ResolutionDto>> {
  try {
    const data = await resolutions_repository.update_resolution(id, payload);
    revalidateTag(billing_tags.resolutions());
    return { success: true, data };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function delete_resolution_action(id: number): Promise<ActionResult> {
  try {
    await resolutions_repository.delete_resolution(id);
    revalidateTag(billing_tags.resolutions());
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
