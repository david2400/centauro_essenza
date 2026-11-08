import type { ParseGridQueryOptions } from '@/server/lib/pagination';

/** Orden del listado de clientes (lista blanca igual que en draco). */
export const CUSTOMER_GRID: ParseGridQueryOptions = {
  sortable: ['id', 'name', 'createdAt', 'lastOrderAt', 'totalSpent', 'ordersCount'],
  filters: [],
  default_sort: { field: 'lastOrderAt', direction: 'desc' },
};
