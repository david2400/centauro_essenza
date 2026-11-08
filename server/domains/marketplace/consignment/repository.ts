import 'server-only';

import { server_fetch } from '@/server/lib/server-fetch';
import { to_page_result, to_search_params } from '@/server/lib/pagination';
import type { GridQuery, PageResult } from '@/shared/models/pagination';
import type {
  ConsignmentAdjustmentRequest,
  ConsignmentDocumentDto,
  ConsignmentMovementDto,
  ConsignmentOptionsDto,
  ConsignmentStatsDto,
  ConsignmentStockRowDto,
  SaveConsignmentDocumentRequest,
} from './types';

const BASE = '/api/shop/marketplace/consignment';

/** Sin caché compartida: depende de la empresa y los permisos del token, y cambia con cada movimiento. */
const NO_CACHE = { revalidate: 0 } as const;

export const consignment_repository = {
  async stock(query: GridQuery): Promise<PageResult<ConsignmentStockRowDto>> {
    const response = await server_fetch.get<unknown>(`${BASE}/stock?${to_search_params(query)}`, NO_CACHE);
    return to_page_result<ConsignmentStockRowDto>(response, query.size);
  },
  stats: () => server_fetch.get<ConsignmentStatsDto>(`${BASE}/stock/stats`, NO_CACHE),
  async movements(query: GridQuery): Promise<PageResult<ConsignmentMovementDto>> {
    const response = await server_fetch.get<unknown>(`${BASE}/movements?${to_search_params(query)}`, NO_CACHE);
    return to_page_result<ConsignmentMovementDto>(response, query.size);
  },
  async documents(query: GridQuery): Promise<PageResult<ConsignmentDocumentDto>> {
    const response = await server_fetch.get<unknown>(`${BASE}/documents?${to_search_params(query)}`, NO_CACHE);
    return to_page_result<ConsignmentDocumentDto>(response, query.size);
  },
  document: (id: number) => server_fetch.get<ConsignmentDocumentDto>(`${BASE}/documents/${id}`, NO_CACHE),
  options: () => server_fetch.get<ConsignmentOptionsDto>(`${BASE}/options`, NO_CACHE),
  save_document: (payload: SaveConsignmentDocumentRequest) =>
    server_fetch.post<ConsignmentDocumentDto>(`${BASE}/documents`, payload, NO_CACHE),
  adjust: (payload: ConsignmentAdjustmentRequest) =>
    server_fetch.post<ConsignmentDocumentDto>(`${BASE}/adjustments`, payload, NO_CACHE),
};
