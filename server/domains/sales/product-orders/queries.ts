import 'server-only';

import { cache } from 'react';

import { product_orders_repository } from './repository';

export const list_product_orders = cache(async () => {
  return product_orders_repository.list_product_orders();
});

/** Solo las líneas de la orden indicada (no la tabla completa). */
export const list_order_items = cache(async (order_id: number) => {
  return product_orders_repository.list_by_order(order_id);
});

export const get_product_order_by_id = cache(async ({ id }: { id: number }) => {
  return product_orders_repository.get_product_order_by_id(id);
});
