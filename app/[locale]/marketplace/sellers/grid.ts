import type { ParseGridQueryOptions } from '@/server/lib/pagination';

/** Orden y filtros del listado de vendedores (lista blanca igual que en draco). */
export const SELLER_GRID: ParseGridQueryOptions = {
  sortable: ['id', 'code', 'legalName', 'status', 'kind', 'city', 'createdAt', 'updatedAt'],
  filters: ['status', 'kind'],
  default_sort: { field: 'updatedAt', direction: 'desc' },
};
