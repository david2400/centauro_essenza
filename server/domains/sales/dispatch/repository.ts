import 'server-only';

import { server_fetch } from '@/server/lib/server-fetch';
import { to_page_result, to_search_params } from '@/server/lib/pagination';
import type { GridQuery, PageResult } from '@/shared/models/pagination';
import type { DispatchRowDto, DispatchStatsDto } from './types';

const DISPATCH = '/api/shop/sales/dispatch';

/** Sin caché compartida: depende de la empresa y los permisos del token, y cambia con cada despacho. */
const NO_CACHE = { revalidate: 0 } as const;

export const dispatch_repository = {
  async search(query: GridQuery): Promise<PageResult<DispatchRowDto>> {
    const response = await server_fetch.get<unknown>(`${DISPATCH}/search?${to_search_params(query)}`, NO_CACHE);
    const page = to_page_result<DispatchRowDto>(response, query.size);
    return { ...page, items: page.items.map((row) => ({ ...row, id: row.order_id })) };
  },
  stats: () => server_fetch.get<DispatchStatsDto>(`${DISPATCH}/stats`, NO_CACHE),
  backfill: () => server_fetch.post<{ updated: number }>(`${DISPATCH}/promises/backfill`, {}, NO_CACHE),
};
