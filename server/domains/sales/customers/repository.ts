import 'server-only';

import { server_fetch } from '@/server/lib/server-fetch';
import { to_page_result, to_search_params } from '@/server/lib/pagination';
import type { GridQuery, PageResult } from '@/shared/models/pagination';
import type { CustomerDetailDto, CustomerLinkDto, CustomerSummaryDto, SaveCustomerRequest } from './types';

const CUSTOMERS = '/api/shop/sales/customers';

/** Sin caché compartida: datos personales que dependen de la empresa y los permisos del token. */
const NO_CACHE = { revalidate: 0 } as const;

export const customers_repository = {
  async search(query: GridQuery): Promise<PageResult<CustomerSummaryDto>> {
    const response = await server_fetch.get<unknown>(`${CUSTOMERS}/search?${to_search_params(query)}`, NO_CACHE);
    return to_page_result<CustomerSummaryDto>(response, query.size);
  },
  by_document(doc_type: string | null | undefined, doc_number: string): Promise<CustomerLinkDto> {
    const params = new URLSearchParams({ docNumber: doc_number });
    if (doc_type) params.set('docType', doc_type);
    return server_fetch.get<CustomerLinkDto>(`${CUSTOMERS}/by-document?${params.toString()}`, NO_CACHE);
  },
  get: (id: number) => server_fetch.get<CustomerDetailDto>(`${CUSTOMERS}/${id}`, NO_CACHE),
  create: (payload: SaveCustomerRequest) => server_fetch.post<CustomerDetailDto>(CUSTOMERS, payload, NO_CACHE),
  update: (id: number, payload: SaveCustomerRequest) => server_fetch.put<CustomerDetailDto>(`${CUSTOMERS}/${id}`, payload, NO_CACHE),
  import_from_orders: () => server_fetch.post<{ created: number }>(`${CUSTOMERS}/import-from-orders`, {}, NO_CACHE),
};
