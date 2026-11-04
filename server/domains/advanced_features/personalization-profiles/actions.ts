'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { personalization_profiles_repository } from './repository';
import type { CreatePersonalizationProfilePayload, UpdatePersonalizationProfilePayload, DeletePersonalizationProfilePayload } from './types';
import { personalization_profiles_tags } from '@/server/lib/cache-tags';
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

function revalidate_personalization_profiles(id?: number) {
  revalidateTag(personalization_profiles_tags.list());
  if (id != null) {
    revalidateTag(personalization_profiles_tags.item(id));
  }
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function create_personalization_profile_action(
  payload: CreatePersonalizationProfilePayload,
): Promise<ActionResult<{ id?: number }>> {
  try {
    const result = await personalization_profiles_repository.create_personalization_profile(payload);
    revalidate_personalization_profiles(result.id);
    return { success: true, data: { id: result.id } };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function update_personalization_profile_action(payload: UpdatePersonalizationProfilePayload): Promise<ActionResult> {
  try {
    await personalization_profiles_repository.update_personalization_profile(payload);
    revalidate_personalization_profiles(payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function delete_personalization_profile_action(payload: DeletePersonalizationProfilePayload): Promise<ActionResult> {
  try {
    await personalization_profiles_repository.delete_personalization_profile(payload);
    revalidate_personalization_profiles(payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
