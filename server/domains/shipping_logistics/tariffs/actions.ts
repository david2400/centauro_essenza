'use server';

import { unstable_rethrow } from 'next/navigation';

import { tariffs_repository } from './repository';
import type {
  OrderShippingQuoteRequest,
  RateCardDto,
  SaveRateCardRequest,
  SaveTariffZoneRequest,
  SaveZoneRateRequest,
  ShippingQuoteDto,
  ShippingQuoteRequest,
  TariffZoneDto,
} from './types';
import { ServerApiError } from '@/server/lib/types';

type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string; status?: number };

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { success: true, data: await fn() };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ServerApiError) {
      return { success: false, error: error.message, status: error.status };
    }
    return { success: false, error: error instanceof Error ? error.message : 'Unexpected error' };
  }
}

/** draco valida empresa, permiso (LOGISTICA.GESTIONAR) y versión (409 si otra persona lo cambió). */
export async function save_rate_card_action(id: number | null, payload: SaveRateCardRequest): Promise<ActionResult<RateCardDto>> {
  return run(() => (id == null ? tariffs_repository.create_card(payload) : tariffs_repository.update_card(id, payload)));
}

export async function delete_rate_card_action(id: number): Promise<ActionResult> {
  return run(() => tariffs_repository.delete_card(id));
}

export async function save_zone_rate_action(cardId: number, zoneKey: string, payload: SaveZoneRateRequest): Promise<ActionResult<RateCardDto>> {
  return run(() => tariffs_repository.save_rate(cardId, zoneKey, payload));
}

export async function delete_zone_rate_action(cardId: number, zoneKey: string, version: number): Promise<ActionResult<RateCardDto>> {
  return run(() => tariffs_repository.delete_rate(cardId, zoneKey, version));
}

export async function save_tariff_zone_action(id: number | null, payload: SaveTariffZoneRequest): Promise<ActionResult<TariffZoneDto>> {
  return run(() => (id == null ? tariffs_repository.create_zone(payload) : tariffs_repository.update_zone(id, payload)));
}

export async function delete_tariff_zone_action(id: number): Promise<ActionResult> {
  return run(() => tariffs_repository.delete_zone(id));
}

/** Simulador y cotización de despachos. No guarda nada. */
export async function quote_shipping_action(payload: ShippingQuoteRequest): Promise<ActionResult<ShippingQuoteDto>> {
  return run(() => tariffs_repository.quote(payload));
}

/** Opciones de envío para el formulario de la orden. No guarda nada. */
export async function quote_order_shipping_action(payload: OrderShippingQuoteRequest): Promise<ActionResult<ShippingQuoteDto>> {
  return run(() => tariffs_repository.order_quote(payload));
}

export async function dismiss_coverage_gap_action(countryId: number, stateId: number, cityId: number): Promise<ActionResult> {
  return run(() => tariffs_repository.dismiss_gap(countryId, stateId, cityId));
}
