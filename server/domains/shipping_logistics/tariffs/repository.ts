import 'server-only';

import { server_fetch } from '@/server/lib/server-fetch';
import type {
  CoverageGapDto,
  OrderShippingQuoteRequest,
  RateCardDto,
  SaveRateCardRequest,
  SaveTariffZoneRequest,
  SaveZoneRateRequest,
  ShippingQuoteDto,
  ShippingQuoteRequest,
  TariffZoneDto,
} from './types';

const BASE = '/api/shop/shipping_logistics/tariffs';
const NO_CACHE = { revalidate: 0 } as const;
const key = (zoneKey: string) => encodeURIComponent(zoneKey);

export const tariffs_repository = {
  cards: () => server_fetch.get<RateCardDto[]>(`${BASE}/cards`, NO_CACHE),
  create_card: (payload: SaveRateCardRequest) => server_fetch.post<RateCardDto>(`${BASE}/cards`, payload, NO_CACHE),
  update_card: (id: number, payload: SaveRateCardRequest) => server_fetch.put<RateCardDto>(`${BASE}/cards/${id}`, payload, NO_CACHE),
  delete_card: (id: number) => server_fetch.delete<void>(`${BASE}/cards/${id}`, NO_CACHE),
  save_rate: (cardId: number, zoneKey: string, payload: SaveZoneRateRequest) =>
    server_fetch.put<RateCardDto>(`${BASE}/cards/${cardId}/rates/${key(zoneKey)}`, payload, NO_CACHE),
  delete_rate: (cardId: number, zoneKey: string, version: number) =>
    server_fetch.delete<RateCardDto>(`${BASE}/cards/${cardId}/rates/${key(zoneKey)}?version=${version}`, NO_CACHE),
  zones: () => server_fetch.get<TariffZoneDto[]>(`${BASE}/zones`, NO_CACHE),
  create_zone: (payload: SaveTariffZoneRequest) => server_fetch.post<TariffZoneDto>(`${BASE}/zones`, payload, NO_CACHE),
  update_zone: (id: number, payload: SaveTariffZoneRequest) => server_fetch.put<TariffZoneDto>(`${BASE}/zones/${id}`, payload, NO_CACHE),
  delete_zone: (id: number) => server_fetch.delete<void>(`${BASE}/zones/${id}`, NO_CACHE),
  quote: (payload: ShippingQuoteRequest) => server_fetch.post<ShippingQuoteDto>(`${BASE}/quote`, payload, NO_CACHE),
  order_quote: (payload: OrderShippingQuoteRequest) =>
    server_fetch.post<ShippingQuoteDto>('/api/shop/sales/orders/shipping-quote', payload, NO_CACHE),
  gaps: () => server_fetch.get<CoverageGapDto[]>(`${BASE}/coverage-gaps`, NO_CACHE),
  dismiss_gap: (countryId: number, stateId: number, cityId: number) =>
    server_fetch.delete<void>(`${BASE}/coverage-gaps?countryId=${countryId}&stateId=${stateId}&cityId=${cityId}`, NO_CACHE),
} as const;
