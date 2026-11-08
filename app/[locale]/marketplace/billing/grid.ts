import type { ParseGridQueryOptions } from '@/server/lib/pagination';

/** Orden y filtros del listado de comisiones (lista blanca igual que en draco). */
export const COMMISSION_GRID: ParseGridQueryOptions = {
  sortable: ['id', 'paidOn', 'accrueOn', 'amount', 'status', 'sellerName', 'createdAt'],
  filters: ['status', 'sellerId'],
  default_sort: { field: 'createdAt', direction: 'desc' },
};
