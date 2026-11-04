'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { product_recommendations_repository } from './repository';
import type { CreateProductRecommendationPayload, UpdateProductRecommendationPayload, DeleteProductRecommendationPayload } from './types';
import { product_recommendations_tags } from '@/server/lib/cache-tags';
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

function revalidate_product_recommendations(id?: number) {
  revalidateTag(product_recommendations_tags.list());
  if (id != null) {
    revalidateTag(product_recommendations_tags.item(id));
  }
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function create_product_recommendation_action(
  payload: CreateProductRecommendationPayload,
): Promise<ActionResult<{ id?: number }>> {
  try {
    const result = await product_recommendations_repository.create_product_recommendation(payload);
    revalidate_product_recommendations(result.id);
    return { success: true, data: { id: result.id } };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function update_product_recommendation_action(payload: UpdateProductRecommendationPayload): Promise<ActionResult> {
  try {
    await product_recommendations_repository.update_product_recommendation(payload);
    revalidate_product_recommendations(payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function delete_product_recommendation_action(payload: DeleteProductRecommendationPayload): Promise<ActionResult> {
  try {
    await product_recommendations_repository.delete_product_recommendation(payload);
    revalidate_product_recommendations(payload.id);
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
