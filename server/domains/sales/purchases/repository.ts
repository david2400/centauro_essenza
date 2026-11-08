import 'server-only';

import { server_fetch } from '@/server/lib/server-fetch';
import { to_page_result, to_search_params } from '@/server/lib/pagination';
import type { GridQuery, PageResult } from '@/shared/models/pagination';
import type { CreatePurchaseRequest, OrderPurchaseDto, PurchaseDetailDto, PurchaseSummaryDto, SkuOptionsDto } from './types';

const PURCHASES = '/api/shop/sales/purchases';

/** Sin caché compartida: los datos dependen de la empresa y los permisos del token. */
const NO_CACHE = { revalidate: 0 } as const;

export const purchases_repository = {
  async search(query: GridQuery): Promise<PageResult<PurchaseSummaryDto>> {
    const response = await server_fetch.get<unknown>(`${PURCHASES}/search?${to_search_params(query)}`, NO_CACHE);
    return to_page_result<PurchaseSummaryDto>(response, query.size);
  },
  get: (id: number) => server_fetch.get<PurchaseDetailDto>(`${PURCHASES}/${id}`, NO_CACHE),
  create: (payload: CreatePurchaseRequest) => server_fetch.post<PurchaseDetailDto>(PURCHASES, payload, NO_CACHE),
  sku_options: (sku_id: number) => server_fetch.get<SkuOptionsDto>(`${PURCHASES}/sku-options/${sku_id}`, NO_CACHE),
  of_order: (order_id: number) => server_fetch.get<OrderPurchaseDto>(`${PURCHASES}/by-order/${order_id}`, NO_CACHE),
};
