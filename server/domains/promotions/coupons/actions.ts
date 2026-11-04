'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { coupons_repository } from './repository';
import type {
  CouponDto,
  CreateCouponDto,
  UpdateCouponPayload,
  ValidateCouponParams,
  CalculateCouponDiscountParams,
} from './types';
import { coupons_tags } from '@/server/lib/cache-tags';
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

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function create_coupon_action(
  payload: CreateCouponDto,
): Promise<ActionResult<{ id: number }>> {
  try {
    const result = await coupons_repository.create_coupon(payload);
    const id = result.id;
    if (typeof id !== 'number') {
      return { success: false, error: 'coupon_id_not_returned' };
    }
    revalidateTag(coupons_tags.list());
    revalidateTag(coupons_tags.coupon(id));
    return { success: true, data: { id } };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function update_coupon_action(
  payload: UpdateCouponPayload,
): Promise<ActionResult> {
  try {
    await coupons_repository.update_coupon(payload);
    revalidateTag(coupons_tags.list());
    revalidateTag(coupons_tags.coupon(payload.id));
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function delete_coupon_action(id: number): Promise<ActionResult> {
  try {
    await coupons_repository.delete_coupon(id);
    revalidateTag(coupons_tags.list());
    revalidateTag(coupons_tags.coupon(id));
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

// ─── Validation helpers ─────────────────────────────────────────────────────

export async function validate_coupon_action(
  params: ValidateCouponParams,
): Promise<ActionResult<{ coupon: CouponDto }>> {
  try {
    const coupon = await coupons_repository.validate_coupon(params);
    revalidateTag(coupons_tags.validation(params.code));
    if (typeof coupon.id === 'number' || typeof coupon.id === 'string') {
      revalidateTag(coupons_tags.coupon(coupon.id));
    }
    return { success: true, data: { coupon } };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function calculate_coupon_discount_action(
  params: CalculateCouponDiscountParams,
): Promise<ActionResult<{ discount: number }>> {
  try {
    const discount = await coupons_repository.calculate_coupon_discount(params);
    revalidateTag(coupons_tags.calculation(params.code));
    return { success: true, data: { discount } };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
