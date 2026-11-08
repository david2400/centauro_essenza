import type { ParseGridQueryOptions } from '@/server/lib/pagination';

/** Orden y filtros del listado de compras (lista blanca igual que en draco). */
export const PURCHASE_GRID: ParseGridQueryOptions = {
  sortable: ['id', 'number', 'createdAt', 'total', 'status'],
  filters: ['status'],
  default_sort: { field: 'createdAt', direction: 'desc' },
};
