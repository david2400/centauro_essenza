import 'server-only';

import { server_fetch } from '@/server/lib/server-fetch';
import { to_list } from '@/server/lib/list-response';
import { product_orders_tags } from '@/server/lib/cache-tags';
import type {
  ProductOrderDto,
  CreateProductOrderPayload,
  UpdateProductOrderPayload,
  DeleteProductOrderPayload,
} from './types';

const product_orders_base_path = '/api/shop/sales/product_orders';
const product_order_by_id_path = (id: number) => `${product_orders_base_path}/${id}`;

export const product_orders_repository = {
  async list_product_orders(): Promise<ProductOrderDto[]> {
    const response = await server_fetch.get<unknown>(product_orders_base_path, {
      revalidate: 30,
      tags: [product_orders_tags.list()],
    });
    return to_list<ProductOrderDto>(response);
  },

  /**
   * Líneas de una orden (`?orderId=`). Un backend que aún no tenga el filtro devuelve todas:
   * por eso se vuelve a filtrar aquí, así la página funciona con ambas versiones.
   */
  async list_by_order(order_id: number): Promise<ProductOrderDto[]> {
    const response = await server_fetch.get<unknown>(product_orders_base_path, {
      params: { orderId: order_id },
      revalidate: 30,
      tags: [product_orders_tags.list()],
    });
    return to_list<ProductOrderDto>(response).filter((item) => item.order_id === order_id);
  },

  async get_product_order_by_id(id: number): Promise<ProductOrderDto> {
    return server_fetch.get<ProductOrderDto>(product_order_by_id_path(id), {
      revalidate: 30,
      tags: [product_orders_tags.item(id)],
    });
  },

  async create_product_order(payload: CreateProductOrderPayload): Promise<ProductOrderDto> {
    return server_fetch.post<ProductOrderDto>(product_orders_base_path, payload, { revalidate: false });
  },

  async update_product_order(payload: UpdateProductOrderPayload): Promise<ProductOrderDto> {
    return server_fetch.put<ProductOrderDto>(product_order_by_id_path(payload.id), payload, { revalidate: false });
  },

  async delete_product_order(payload: DeleteProductOrderPayload): Promise<void> {
    return server_fetch.delete<void>(product_order_by_id_path(payload.id), { revalidate: false });
  },
} as const;
