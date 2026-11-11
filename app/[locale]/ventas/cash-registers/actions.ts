'use server';

import {
  add_cash_movement_action,
  close_cash_session_action,
  create_cash_register_action,
  delete_cash_register_action,
  list_cashiers_action,
  open_cash_session_action,
  pos_checkout_action,
  update_cash_register_action,
  create_store_action,
  update_store_action,
  delete_store_action,
} from '@/server/domains/sales/cash/actions';
import type {
  CashMovementDto,
  CashRegisterDto,
  CashierDto,
  CashSessionDto,
  CloseCashSessionDto,
  CreateCashMovementDto,
  OpenCashSessionDto,
  PosCheckoutDto,
  PosCheckoutResultDto,
  SaveCashRegisterDto,
  SaveStoreDto,
  StoreDto,
} from '@/server/domains/sales/cash/types';

type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string };

const fail = (result: { error?: string }, fallback: string): ActionResult<never> => ({
  success: false,
  error: result.error ?? fallback,
});

export async function createStoreServerAction(payload: SaveStoreDto): Promise<ActionResult<StoreDto>> {
  const result = await create_store_action(payload);
  return result.success ? { success: true, data: result.data } : fail(result, 'No se pudo crear el punto de venta');
}

export async function updateStoreServerAction(id: number, payload: SaveStoreDto): Promise<ActionResult<StoreDto>> {
  const result = await update_store_action(id, payload);
  return result.success ? { success: true, data: result.data } : fail(result, 'No se pudo actualizar el punto de venta');
}

export async function deleteStoreServerAction(id: number): Promise<ActionResult> {
  const result = await delete_store_action(id);
  return result.success ? { success: true, data: undefined } : fail(result, 'No se pudo eliminar el punto de venta');
}

export async function createCashRegisterServerAction(payload: SaveCashRegisterDto): Promise<ActionResult<CashRegisterDto>> {
  const result = await create_cash_register_action(payload);
  return result.success ? { success: true, data: result.data } : fail(result, 'No se pudo crear la caja');
}

export async function updateCashRegisterServerAction(id: number, payload: SaveCashRegisterDto): Promise<ActionResult<CashRegisterDto>> {
  const result = await update_cash_register_action(id, payload);
  return result.success ? { success: true, data: result.data } : fail(result, 'No se pudo actualizar la caja');
}

export async function deleteCashRegisterServerAction(id: number): Promise<ActionResult> {
  const result = await delete_cash_register_action(id);
  return result.success ? { success: true, data: undefined } : fail(result, 'No se pudo eliminar la caja');
}

export async function listCashiersServerAction(): Promise<ActionResult<CashierDto[]>> {
  const result = await list_cashiers_action();
  return result.success ? { success: true, data: result.data } : fail(result, 'No se pudieron cargar los cajeros');
}

export async function openCashSessionServerAction(payload: OpenCashSessionDto): Promise<ActionResult<CashSessionDto>> {
  const result = await open_cash_session_action(payload);
  return result.success ? { success: true, data: result.data } : fail(result, 'No se pudo abrir la caja');
}

export async function closeCashSessionServerAction(id: number, payload: CloseCashSessionDto): Promise<ActionResult<CashSessionDto>> {
  const result = await close_cash_session_action(id, payload);
  return result.success ? { success: true, data: result.data } : fail(result, 'No se pudo cerrar la caja');
}

export async function addCashMovementServerAction(id: number, payload: CreateCashMovementDto): Promise<ActionResult<CashMovementDto>> {
  const result = await add_cash_movement_action(id, payload);
  return result.success ? { success: true, data: result.data } : fail(result, 'No se pudo registrar el movimiento');
}

export async function posCheckoutServerAction(payload: PosCheckoutDto): Promise<ActionResult<PosCheckoutResultDto>> {
  const result = await pos_checkout_action(payload);
  return result.success ? { success: true, data: result.data } : fail(result, 'No se pudo registrar la venta');
}
