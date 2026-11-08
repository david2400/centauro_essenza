'use server';

import { unstable_rethrow } from 'next/navigation';

import { marketplace_repository } from './repository';
import type {
  AdjustmentRequest,
  CommissionDto,
  FeeRunDto,
  SellerAccountDto,
  SellerPaymentRequest,
  AssignPlanRequest,
  AssignmentDto,
  OfferDetailDto,
  OfferEventDto,
  SaveOfferRequest,
  SellerOptionDto,
  DocumentDto,
  PlanDto,
  PlanEventDto,
  SavePlanRequest,
  SaveSellerRequest,
  SellerDetailDto,
  SellerEventDto,
  SimulationDto,
  SimulationRequest,
} from './types';
import { field_errors_from } from '@/server/lib/pagination';
import { ServerApiError } from '@/server/lib/types';

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; status?: number; field_errors?: Record<string, string> };

function handle_error(error: unknown): ActionResult<never> {
  if (error instanceof ServerApiError) {
    return { success: false, error: error.message, status: error.status, field_errors: field_errors_from(error) };
  }
  return { success: false, error: error instanceof Error ? error.message : 'Unexpected error' };
}

async function run<T>(operation: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { success: true, data: await operation() };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

// ── Vendedores ─────────────────────────────────────────────────────────────

export async function create_seller_action(payload: SaveSellerRequest): Promise<ActionResult<SellerDetailDto>> {
  return run(() => marketplace_repository.create_seller(payload));
}

export async function update_seller_action(id: number, payload: SaveSellerRequest): Promise<ActionResult<SellerDetailDto>> {
  return run(() => marketplace_repository.update_seller(id, payload));
}

export async function transition_seller_action(
  id: number,
  payload: { action: string; reason?: string; version: number },
): Promise<ActionResult<SellerDetailDto>> {
  return run(() => marketplace_repository.transition_seller(id, payload));
}

export async function seller_events_action(id: number): Promise<ActionResult<SellerEventDto[]>> {
  return run(() => marketplace_repository.seller_events(id));
}

export async function upload_seller_document_action(id: number, form: FormData): Promise<ActionResult<DocumentDto>> {
  return run(() => marketplace_repository.upload_document(id, form));
}

export async function review_seller_document_action(
  id: number,
  documentId: number,
  payload: { status: string; note?: string },
): Promise<ActionResult<DocumentDto>> {
  return run(() => marketplace_repository.review_document(id, documentId, payload));
}

export async function assign_plan_action(id: number, payload: AssignPlanRequest): Promise<ActionResult<AssignmentDto>> {
  return run(() => marketplace_repository.assign_plan(id, payload));
}

export async function cancel_assignment_action(id: number, assignmentId: number, reason: string): Promise<ActionResult<void>> {
  return run(() => marketplace_repository.cancel_assignment(id, assignmentId, reason));
}

// ── Planes ─────────────────────────────────────────────────────────────────

export async function assignable_plans_action(q: string): Promise<ActionResult<PlanDto[]>> {
  return run(() => marketplace_repository.assignable_plans(q));
}

export async function create_plan_action(payload: SavePlanRequest): Promise<ActionResult<PlanDto>> {
  return run(() => marketplace_repository.create_plan(payload));
}

export async function update_plan_action(id: number, payload: SavePlanRequest): Promise<ActionResult<PlanDto>> {
  return run(() => marketplace_repository.update_plan(id, payload));
}

export async function plan_command_action(
  id: number,
  command: 'publish' | 'versions' | 'retire',
  lock_version: number,
): Promise<ActionResult<PlanDto>> {
  return run(() => marketplace_repository.plan_command(id, command, lock_version));
}

export async function plan_events_action(id: number): Promise<ActionResult<PlanEventDto[]>> {
  return run(() => marketplace_repository.plan_events(id));
}

export async function simulate_plan_action(id: number, payload: SimulationRequest): Promise<ActionResult<SimulationDto>> {
  return run(() => marketplace_repository.simulate(id, payload));
}

// ── Ofertas ────────────────────────────────────────────────────────────────

export async function lookup_sellers_action(q: string, kind?: string): Promise<ActionResult<SellerOptionDto[]>> {
  return run(() => marketplace_repository.lookup_sellers(q, kind));
}

export async function create_offer_action(payload: SaveOfferRequest): Promise<ActionResult<OfferDetailDto>> {
  return run(() => marketplace_repository.create_offer(payload));
}

export async function update_offer_action(id: number, payload: SaveOfferRequest): Promise<ActionResult<OfferDetailDto>> {
  return run(() => marketplace_repository.update_offer(id, payload));
}

export async function transition_offer_action(
  id: number,
  payload: { action: string; reason?: string; lock_version: number },
): Promise<ActionResult<OfferDetailDto>> {
  return run(() => marketplace_repository.transition_offer(id, payload));
}

export async function offer_events_action(id: number): Promise<ActionResult<OfferEventDto[]>> {
  return run(() => marketplace_repository.offer_events(id));
}

// ── Comisiones y estado de cuenta ──────────────────────────────────────────

export async function accrue_due_action(): Promise<ActionResult<{ accrued: number }>> {
  return run(() => marketplace_repository.accrue_due());
}

export async function generate_fees_action(cycle: string): Promise<ActionResult<FeeRunDto>> {
  return run(() => marketplace_repository.generate_fees(cycle));
}

export async function seller_account_action(id: number, as_of?: string): Promise<ActionResult<SellerAccountDto>> {
  return run(() => marketplace_repository.seller_account(id, as_of));
}

export async function register_seller_payment_action(id: number, payload: SellerPaymentRequest): Promise<ActionResult<SellerAccountDto>> {
  return run(() => marketplace_repository.register_seller_payment(id, payload));
}

export async function register_seller_settlement_action(id: number, payload: SellerPaymentRequest): Promise<ActionResult<SellerAccountDto>> {
  return run(() => marketplace_repository.register_seller_settlement(id, payload));
}

export async function adjust_seller_account_action(id: number, payload: AdjustmentRequest): Promise<ActionResult<SellerAccountDto>> {
  return run(() => marketplace_repository.adjust_seller_account(id, payload));
}

export async function recalculate_commission_action(id: number): Promise<ActionResult<CommissionDto>> {
  return run(() => marketplace_repository.recalculate_commission(id));
}
