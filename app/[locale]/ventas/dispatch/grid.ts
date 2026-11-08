import type { ParseGridQueryOptions } from '@/server/lib/pagination';

/** Orden y filtros del tablero de despachos (lista blanca igual que en draco). */
export const DISPATCH_GRID: ParseGridQueryOptions = {
  sortable: ['shipBy', 'paidAt', 'shippedAt'],
  filters: ['view', 'seller'],
  default_sort: { field: 'shipBy', direction: 'asc' },
};
