import type { ParseGridQueryOptions } from '@/server/lib/pagination';

/** Orden y filtros de reclamos (lista blanca igual que en draco). */
export const DISPUTE_GRID: ParseGridQueryOptions = {
  sortable: ['createdAt', 'respondBy'],
  filters: ['status', 'sellerId'],
  default_sort: { field: 'createdAt', direction: 'desc' },
};
