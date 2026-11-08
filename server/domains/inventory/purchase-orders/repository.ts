import 'server-only';

import { server_fetch } from '@/server/lib/server-fetch';
import { to_page_result, to_search_params } from '@/server/lib/pagination';
import type { GridQuery, PageResult } from '@/shared/models/pagination';
import type {
  PurchaseOrderDetailDto,
  PurchaseOrderOptionsDto,
  PurchaseOrderStatsDto,
  PurchaseOrderSummaryDto,
  PurchaseSuggestionsDto,
  SavePurchaseOrderRequest,
  SupplierProductDto,
} from './types';

const BASE = '/api/shop/inventory/purchase-orders';
/** Sin caché compartida: depende de los permisos del token y cambia con cada recepción. */
const NO_CACHE = { revalidate: 0 } as const;

export const purchase_orders_repository = {
  async search(query: GridQuery): Promise<PageResult<PurchaseOrderSummaryDto>> {
    const response = await server_fetch.get<unknown>(`${BASE}/search?${to_search_params(query)}`, NO_CACHE);
    return to_page_result<PurchaseOrderSummaryDto>(response, query.size);
  },
  stats: () => server_fetch.get<PurchaseOrderStatsDto>(`${BASE}/stats`, NO_CACHE),
  options: () => server_fetch.get<PurchaseOrderOptionsDto>(`${BASE}/options`, NO_CACHE),
  supplier_products: (supplierId: number) => server_fetch.get<SupplierProductDto[]>(`${BASE}/suppliers/${supplierId}/products`, NO_CACHE),
  suggestions: (warehouseId?: number | null) =>
    server_fetch.get<PurchaseSuggestionsDto>(`${BASE}/suggestions${warehouseId ? `?warehouseId=${warehouseId}` : ''}`, NO_CACHE),
  get: (id: number) => server_fetch.get<PurchaseOrderDetailDto>(`${BASE}/${id}`, NO_CACHE),
  create: (payload: SavePurchaseOrderRequest) => server_fetch.post<PurchaseOrderDetailDto>(BASE, payload, NO_CACHE),
  update: (id: number, payload: SavePurchaseOrderRequest) => server_fetch.put<PurchaseOrderDetailDto>(`${BASE}/${id}`, payload, NO_CACHE),
  command: (id: number, command: 'send' | 'cancel' | 'close', reason: string | null, lock_version: number) =>
    server_fetch.post<PurchaseOrderDetailDto>(`${BASE}/${id}/${command}`, { reason, lock_version }, NO_CACHE),
  receive: (id: number, payload: { reference?: string | null; notes?: string | null; lines: { line_id: number; quantity: number }[]; lock_version: number }) =>
    server_fetch.post<PurchaseOrderDetailDto>(`${BASE}/${id}/receipts`, payload, NO_CACHE),
};
