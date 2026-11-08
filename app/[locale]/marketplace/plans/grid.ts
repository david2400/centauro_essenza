import type { ParseGridQueryOptions } from '@/server/lib/pagination';

/** Orden y filtros del listado de planes (lista blanca igual que en draco). */
export const PLAN_GRID: ParseGridQueryOptions = {
  sortable: ['id', 'code', 'name', 'status', 'modality', 'version', 'validFrom', 'updatedAt'],
  filters: ['status', 'modality'],
  default_sort: { field: 'code', direction: 'asc' },
};
