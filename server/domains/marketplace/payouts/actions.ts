'use server';

import { unstable_rethrow } from 'next/navigation';

import { payouts_repository } from './repository';
import type {
  BankAccountDto,
  BankDto,
  BankMatchDto,
  CreatePayoutBatchRequest,
  PayoutBatchDetailDto,
  PayoutExportFile,
  PayoutFormatDto,
  PayoutLayoutDto,
  PayoutPayRequest,
  SaveBankAccountRequest,
  SavePayoutFormatRequest,
  SaveBankRequest,
} from './types';
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

export async function create_payout_batch_action(payload: CreatePayoutBatchRequest): Promise<ActionResult<PayoutBatchDetailDto>> {
  return run(() => payouts_repository.create(payload));
}

/** itemId nulo = todos los pendientes del lote. */
export async function pay_payout_action(id: number, itemId: number | null, payload: PayoutPayRequest): Promise<ActionResult<PayoutBatchDetailDto>> {
  return run(() => (itemId == null ? payouts_repository.pay_all(id, payload) : payouts_repository.pay(id, itemId, payload)));
}

export async function reject_payout_item_action(id: number, itemId: number, reason: string): Promise<ActionResult<PayoutBatchDetailDto>> {
  return run(() => payouts_repository.reject(id, itemId, reason));
}

export async function cancel_payout_batch_action(id: number, reason: string): Promise<ActionResult<PayoutBatchDetailDto>> {
  return run(() => payouts_repository.cancel(id, reason));
}

/** Archivo del lote con el formato del banco pagador (draco exige COMISIONES.GESTIONAR). */
export async function export_payout_batch_action(id: number, format?: number | null, date?: string | null): Promise<ActionResult<PayoutExportFile>> {
  return run(() => payouts_repository.export_file(id, format, date));
}

export async function save_payout_format_action(id: number | null, payload: SavePayoutFormatRequest): Promise<ActionResult<PayoutFormatDto>> {
  return run(() => payouts_repository.save_format(id, payload));
}

export async function preview_payout_format_action(layout: PayoutLayoutDto): Promise<ActionResult<string>> {
  return run(async () => (await payouts_repository.preview_format(layout)).content);
}

/** Envía el lote a la dispersión automática (sandbox salvo habilitación explícita en draco). */
export async function dispatch_payout_batch_action(id: number): Promise<ActionResult<PayoutBatchDetailDto>> {
  return run(() => payouts_repository.dispatch(id));
}

/** Consulta en el proveedor el resultado de cada pago del lote. */
export async function sync_payout_batch_action(id: number): Promise<ActionResult<PayoutBatchDetailDto>> {
  return run(() => payouts_repository.sync(id));
}

/** Liga las entidades del catálogo con las del proveedor de dispersión (por código o nombre). */
export async function match_provider_banks_action(): Promise<ActionResult<BankMatchDto>> {
  return run(() => payouts_repository.match_provider_banks());
}

/** id nulo = agregar una entidad al catálogo. */
export async function save_bank_action(id: number | null, payload: SaveBankRequest): Promise<ActionResult<BankDto>> {
  return run(() => (id == null ? payouts_repository.create_bank(payload) : payouts_repository.update_bank(id, payload)));
}

export async function save_bank_account_action(sellerId: number, payload: SaveBankAccountRequest): Promise<ActionResult<BankAccountDto>> {
  return run(() => payouts_repository.save_bank_account(sellerId, payload));
}
