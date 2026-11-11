'use server';

import { unstable_rethrow } from 'next/navigation';
import {
  entry_inventory_action,
  exit_inventory_action,
  transfer_inventory_action,
} from '@/server/domains/inventory/inventory-movements/actions';
import { export_inventory_movements } from '@/server/domains/inventory/inventory-movements/queries';
import type { InventoryMovementDto } from '@/server/domains/inventory/inventory-movements/types';
import { parse_grid_query } from '@/server/lib/pagination';
import type { IInventoryMovementRow } from '@/modules/inventory/inventoryMovement/models/inventory-movement.interface';
import { INVENTORY_MOVEMENT_GRID } from './grid';
import { with_names } from './rows';

type ActionResult = { success: true } | { success: false; error: string };

const HANDLERS = {
  ENTRY: entry_inventory_action,
  EXIT: exit_inventory_action,
  TRANSFER: transfer_inventory_action,
} as const;

/**
 * Registra un movimiento en el endpoint que corresponde a su tipo
 * (`/entry`, `/exit` o `/transfer`). Devuelve el resultado en lugar de lanzar.
 */
export async function registerMovementServerAction(payload: InventoryMovementDto): Promise<ActionResult> {
  const handler = HANDLERS[payload.type as keyof typeof HANDLERS];
  if (!handler) {
    return { success: false, error: `Tipo de movimiento no válido: ${payload.type}` };
  }

  const result = await handler(payload);
  return result.success
    ? { success: true }
    : { success: false, error: result.error ?? 'No se pudo registrar el movimiento' };
}

/**
 * Exporta el kardex completo con el orden actual (no solo la página visible),
 * con nombres de producto y código de SKU ya resueltos.
 */
export async function exportMovementsServerAction(
  params: Record<string, string>,
): Promise<{ success: true; data: { items: IInventoryMovementRow[]; truncated: boolean } } | { success: false; error: string }> {
  try {
    const { items, truncated } = await export_inventory_movements(parse_grid_query(params, INVENTORY_MOVEMENT_GRID));
    return { success: true, data: { items: await with_names(items), truncated } };
  } catch (error) {
    unstable_rethrow(error);
    return { success: false, error: error instanceof Error ? error.message : 'No se pudo exportar' };
  }
}
