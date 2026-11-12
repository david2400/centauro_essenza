import 'server-only';

import { server_fetch } from '@/server/lib/server-fetch';
import { to_list } from '@/server/lib/list-response';
import { payments_tags } from '@/server/lib/cache-tags';
import { to_page_result, to_search_params } from '@/server/lib/pagination';
import type { GridQuery, PageResult } from '@/shared/models/pagination';
import type {
  CheckoutDto,
  OrderPaymentsDto,
  PaymentAction,
  PaymentActionDto,
  PaymentDto,
  PaymentEventDto,
  PaymentsSummaryDto,
  RegisterPaymentDto,
  RegisterSplitPaymentDto,
  StartCheckoutDto,
} from './types';

const base_path = '/api/shop/sales/payments';

/** Filtros del listado que entiende el backend (mismo nombre en la URL del panel). */
const filter_params = (filters: Record<string, string>) => {
  const search = new URLSearchParams();
  for (const key of ['status', 'methodId', 'channel', 'provider', 'orderId', 'from', 'to'] as const) {
    if (filters[key]) search.set(key, filters[key]);
  }
  return search;
};

export const payments_repository = {
  async search_payments(query: GridQuery): Promise<PageResult<PaymentDto>> {
    const response = await server_fetch.get<unknown>(`${base_path}?${to_search_params(query)}`, {
      revalidate: 0,
      tags: [payments_tags.all()],
    });
    return to_page_result<PaymentDto>(response, query.size);
  },

  async summarize_payments(query: Pick<GridQuery, 'q' | 'filters'>): Promise<PaymentsSummaryDto> {
    const search = filter_params(query.filters);
    if (query.q) search.set('q', query.q);
    return server_fetch.get<PaymentsSummaryDto>(`${base_path}/summary?${search}`, {
      revalidate: 0,
      tags: [payments_tags.all()],
    });
  },

  async get_order_payments(order_id: number): Promise<OrderPaymentsDto> {
    return server_fetch.get<OrderPaymentsDto>(`/api/shop/sales/orders/${order_id}/payments`, {
      revalidate: 0,
      tags: [payments_tags.order(order_id)],
    });
  },

  async get_payment_events(id: number): Promise<PaymentEventDto[]> {
    const response = await server_fetch.get<unknown>(`${base_path}/${id}/events`, { revalidate: 0 });
    return to_list<PaymentEventDto>(response);
  },

  async register_payment(payload: RegisterPaymentDto): Promise<PaymentDto> {
    return server_fetch.post<PaymentDto>(base_path, payload, { revalidate: false });
  },

  /** Varios medios en una sola operación: si una línea falla no se registra ninguna. */
  async register_split_payment(payload: RegisterSplitPaymentDto): Promise<PaymentDto[]> {
    const response = await server_fetch.post<unknown>(`${base_path}/split`, payload, { revalidate: false });
    return to_list<PaymentDto>(response);
  },

  async start_checkout(payload: StartCheckoutDto): Promise<CheckoutDto> {
    return server_fetch.post<CheckoutDto>(`${base_path}/checkout`, payload, { revalidate: false });
  },

  async run_action(id: number, action: PaymentAction, payload?: PaymentActionDto): Promise<PaymentDto> {
    return server_fetch.post<PaymentDto>(`${base_path}/${id}/${action}`, action === 'sync' ? undefined : (payload ?? {}), {
      revalidate: false,
    });
  },
} as const;
