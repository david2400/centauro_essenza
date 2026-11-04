'use server';

import { unstable_rethrow } from 'next/navigation';
import { revalidateTag } from 'next/cache';

import { cash_repository } from './repository';
import type {
  CashMovementDto,
  CashRegisterDto,
  CashSessionDto,
  CloseCashSessionDto,
  CreateCashMovementDto,
  OpenCashSessionDto,
  PosCheckoutDto,
  PosCheckoutResultDto,
  SaveCashRegisterDto,
  SaveStoreDto,
  StoreDto,
} from './types';
import { billing_tags, cash_tags, orders_tags, payments_tags } from '@/server/lib/cache-tags';
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

function revalidate_cash(session_id?: number | null) {
  revalidateTag(cash_tags.stores());
  revalidateTag(cash_tags.registers());
  revalidateTag(cash_tags.sessions());
  if (session_id != null) revalidateTag(cash_tags.session(session_id));
}

export async function create_store_action(payload: SaveStoreDto): Promise<ActionResult<StoreDto>> {
  try {
    const data = await cash_repository.create_store(payload);
    revalidate_cash();
    return { success: true, data };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function update_store_action(id: number, payload: SaveStoreDto): Promise<ActionResult<StoreDto>> {
  try {
    const data = await cash_repository.update_store(id, payload);
    revalidate_cash();
    return { success: true, data };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function delete_store_action(id: number): Promise<ActionResult> {
  try {
    await cash_repository.delete_store(id);
    revalidate_cash();
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function create_cash_register_action(payload: SaveCashRegisterDto): Promise<ActionResult<CashRegisterDto>> {
  try {
    const data = await cash_repository.create_cash_register(payload);
    revalidate_cash();
    return { success: true, data };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function update_cash_register_action(id: number, payload: SaveCashRegisterDto): Promise<ActionResult<CashRegisterDto>> {
  try {
    const data = await cash_repository.update_cash_register(id, payload);
    revalidate_cash();
    return { success: true, data };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function delete_cash_register_action(id: number): Promise<ActionResult> {
  try {
    await cash_repository.delete_cash_register(id);
    revalidate_cash();
    return { success: true, data: undefined };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function open_cash_session_action(payload: OpenCashSessionDto): Promise<ActionResult<CashSessionDto>> {
  try {
    const data = await cash_repository.open_cash_session(payload);
    revalidate_cash(data.id);
    return { success: true, data };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function close_cash_session_action(id: number, payload: CloseCashSessionDto): Promise<ActionResult<CashSessionDto>> {
  try {
    const data = await cash_repository.close_cash_session(id, payload);
    revalidate_cash(id);
    return { success: true, data };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function add_cash_movement_action(id: number, payload: CreateCashMovementDto): Promise<ActionResult<CashMovementDto>> {
  try {
    const data = await cash_repository.add_cash_movement(id, payload);
    revalidate_cash(id);
    return { success: true, data };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

export async function get_cash_session_action(id: number): Promise<ActionResult<CashSessionDto>> {
  try {
    return { success: true, data: await cash_repository.get_cash_session(id) };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}

/** Venta de mostrador: también cambia órdenes, pagos, stock y (si aplica) facturas. */
export async function pos_checkout_action(payload: PosCheckoutDto): Promise<ActionResult<PosCheckoutResultDto>> {
  try {
    const data = await cash_repository.pos_checkout(payload);
    revalidate_cash(payload.cash_session_id);
    revalidateTag(orders_tags.list());
    revalidateTag(payments_tags.all());
    revalidateTag(billing_tags.invoices());
    return { success: true, data };
  } catch (error) {
    unstable_rethrow(error);
    return handle_error(error);
  }
}
