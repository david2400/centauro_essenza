import 'server-only';

import { server_fetch } from '@/server/lib/server-fetch';
import { to_page_result, to_search_params } from '@/server/lib/pagination';
import type { GridQuery, PageResult } from '@/shared/models/pagination';
import type { DisputeDetailDto, DisputeStatsDto, DisputeSummaryDto, OpenDisputeRequest, OrderDisputeDto, ResolveDisputeRequest } from './types';

const BASE = '/api/shop/marketplace/disputes';
/** Sin caché compartida: depende de la empresa y los permisos del token. */
const NO_CACHE = { revalidate: 0 } as const;

export const disputes_repository = {
  async search(query: GridQuery): Promise<PageResult<DisputeSummaryDto>> {
    const response = await server_fetch.get<unknown>(`${BASE}/search?${to_search_params(query)}`, NO_CACHE);
    return to_page_result<DisputeSummaryDto>(response, query.size);
  },
  stats: () => server_fetch.get<DisputeStatsDto>(`${BASE}/stats`, NO_CACHE),
  get: (id: number) => server_fetch.get<DisputeDetailDto>(`${BASE}/${id}`, NO_CACHE),
  /** null si la orden no tiene reclamos (204). */
  async of_order(orderId: number): Promise<OrderDisputeDto | null> {
    const result = await server_fetch.get<OrderDisputeDto | null | ''>(`${BASE}/by-order/${orderId}`, NO_CACHE);
    return result && typeof result === 'object' ? result : null;
  },
  open: (payload: OpenDisputeRequest) => server_fetch.post<DisputeDetailDto>(BASE, payload, NO_CACHE),
  respond: (id: number, response: string, lock_version: number) =>
    server_fetch.post<DisputeDetailDto>(`${BASE}/${id}/respond`, { response, lock_version }, NO_CACHE),
  resolve: (id: number, payload: ResolveDisputeRequest) => server_fetch.post<DisputeDetailDto>(`${BASE}/${id}/resolve`, payload, NO_CACHE),
  cancel: (id: number, reason: string, lock_version: number) =>
    server_fetch.post<DisputeDetailDto>(`${BASE}/${id}/cancel`, { reason, lock_version }, NO_CACHE),
};
