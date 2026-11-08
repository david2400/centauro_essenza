import type { ParseGridQueryOptions } from '@/server/lib/pagination';

/** Orden y filtros del listado de ofertas (lista blanca igual que en draco). */
export const OFFER_GRID: ParseGridQueryOptions = {
  sortable: ['id', 'price', 'status', 'productName', 'sellerName', 'availableQuantity', 'updatedAt', 'publishedAt'],
  filters: ['status', 'sellerId'],
  default_sort: { field: 'updatedAt', direction: 'desc' },
};
