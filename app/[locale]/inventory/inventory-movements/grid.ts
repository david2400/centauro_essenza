import type { ParseGridQueryOptions } from '@/server/lib/pagination';

/**
 * Kardex de movimientos: el backend (`Pageable`) ordena por cualquier campo de la entidad,
 * pero solo exponemos fecha y cantidad. Sin filtros de URL hasta que exista `/movements/search`.
 */
export const INVENTORY_MOVEMENT_GRID: ParseGridQueryOptions = {
  sortable: ['createdAt', 'quantity'],
  filters: [],
  default_sort: { field: 'createdAt', direction: 'desc' },
};
