import type { ParseGridQueryOptions } from '@/server/lib/pagination';

/** Campos ordenables y filtros de URL del listado de órdenes (igual que el backend). */
export const ORDER_GRID: ParseGridQueryOptions = {
  sortable: ['id', 'orderNumber', 'customerName', 'total', 'state', 'priority', 'promisedDate', 'channel', 'createdAt', 'updatedAt'],
  filters: ['state', 'paymentStatus', 'channel', 'storeId', 'priority', 'deliveryMethod', 'period', 'overdue', 'origin'],
  default_sort: { field: 'id', direction: 'desc' },
};
