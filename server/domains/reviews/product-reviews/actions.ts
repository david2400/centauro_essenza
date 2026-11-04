'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { product_reviews_repository } from './repository';
import {
  CreateProductReviewDto,
  UpdateProductReviewPayload,
  VoteReviewPayload,
  ModerateReviewPayload,
} from './types';
import { product_reviews_tags } from '@/server/lib/cache-tags';
import { ServerApiError } from '@/server/lib/types';

// ─── Result helpers ──────────────────────────────────────────────────────────

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

// ─── Review CRUD ─────────────────────────────────────────────────────────────

export async function create_product_review_action(
  payload: CreateProductReviewDto,
): Promise<ActionResult<{ id: number }>> {
  try {
    const result = await product_reviews_repository.create_review(payload);
    const id = result.id;
    if (typeof id !== 'number') {
      return { success: false, error: 'product_review_id_not_returned' };
    }
    revalidateTag(product_reviews_tags.list());
    return { success: true, data: { id } };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function update_product_review_action(
  payload: UpdateProductReviewPayload,
): Promise<ActionResult> {
  try {
    await product_reviews_repository.update_review(payload);
    revalidateTag(product_reviews_tags.list());
    revalidateTag(product_reviews_tags.review(payload.id));
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function delete_product_review_action(id: number): Promise<ActionResult> {
  try {
    await product_reviews_repository.delete_review(id);
    revalidateTag(product_reviews_tags.list());
    revalidateTag(product_reviews_tags.review(id));
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

// ─── Voting / Moderation ─────────────────────────────────────────────────────

export async function vote_product_review_action(payload: VoteReviewPayload): Promise<ActionResult> {
  try {
    await product_reviews_repository.vote_review_helpful(payload);
    revalidateTag(product_reviews_tags.votes(payload.id));
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function moderate_product_review_action(
  payload: ModerateReviewPayload,
): Promise<ActionResult> {
  try {
    await product_reviews_repository.moderate_review(payload);
    revalidateTag(product_reviews_tags.moderation(payload.id));
    revalidateTag(product_reviews_tags.list());
    revalidateTag(product_reviews_tags.review(payload.id));
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
