import type { ParseGridQueryOptions } from '@/server/lib/pagination';

/** Orden y filtros de órdenes de compra (lista blanca igual que en draco). */
export const PURCHASE_ORDER_GRID: ParseGridQueryOptions = {
  sortable: ['createdAt', 'expectedDate', 'total'],
  filters: ['status', 'supplierId'],
  default_sort: { field: 'createdAt', direction: 'desc' },
};
