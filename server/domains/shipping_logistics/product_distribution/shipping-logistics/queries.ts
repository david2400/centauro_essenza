import 'server-only';

import { cache } from 'react';

import { shipping_logistics_repository } from './repository';

export const list_trackings = cache(async () => {
  return shipping_logistics_repository.list_trackings();
});

/** Seguimientos de un despacho (`?dispatchProductId=`). */
export const list_trackings_of_dispatch = cache(async (dispatch_id: number) => {
  const items = await shipping_logistics_repository.list_trackings({ dispatchProductId: dispatch_id });
  return items.filter((item) => item.dispatch_product_id === dispatch_id);
});

export const get_tracking_by_id = cache(async ({ id }: { id: number }) => {
  return shipping_logistics_repository.get_tracking_by_id(id);
});

export const list_dispatch_details = cache(async () => {
  return shipping_logistics_repository.list_dispatch_details();
});

/** Líneas de un despacho (`?dispatchProductId=`). */
export const list_dispatch_details_of_dispatch = cache(async (dispatch_id: number) => {
  const items = await shipping_logistics_repository.list_dispatch_details({ dispatchProductId: dispatch_id });
  return items.filter((item) => item.dispatch_product_id === dispatch_id);
});

export const get_dispatch_detail_by_id = cache(async ({ id }: { id: number }) => {
  return shipping_logistics_repository.get_dispatch_detail_by_id(id);
});
