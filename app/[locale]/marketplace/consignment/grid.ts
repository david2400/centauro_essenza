import type { ParseGridQueryOptions } from '@/server/lib/pagination';

/** Orden y filtros del stock en consignación (lista blanca igual que en draco). */
export const CONSIGNMENT_GRID: ParseGridQueryOptions = {
  sortable: ['onHand', 'firstReceivedAt', 'lastMovementAt', 'sellerName', 'skuCode'],
  filters: ['sellerId', 'warehouseId'],
  default_sort: { field: 'firstReceivedAt', direction: 'asc' },
};

export const CONSIGNMENT_MOVEMENTS_GRID: ParseGridQueryOptions = {
  sortable: ['createdAt', 'quantity'],
  filters: ['sellerId', 'skuId', 'warehouseId', 'orderId', 'kind'],
  default_sort: { field: 'createdAt', direction: 'desc' },
};

export const CONSIGNMENT_DOCUMENTS_GRID: ParseGridQueryOptions = {
  sortable: ['createdAt', 'units'],
  filters: ['sellerId', 'kind'],
  default_sort: { field: 'createdAt', direction: 'desc' },
};
