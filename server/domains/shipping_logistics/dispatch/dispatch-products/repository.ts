import 'server-only';

import { server_fetch } from '@/server/lib/server-fetch';
import { dispatch_products_tags } from '@/server/lib/cache-tags';
import type {
  DispatchProductDto,
  CreateDispatchProductDto,
  UpdateDispatchProductPayload,
  DeleteDispatchProductPayload,
} from './types';

const dispatch_products_base_path = '/api/shop/dispatch/dispatch_products';
const dispatch_product_by_id_path = (id: number) => `${dispatch_products_base_path}/${id}`;

export const dispatch_products_repository = {
  async list_dispatch_products(): Promise<DispatchProductDto[]> {
    return server_fetch.get<DispatchProductDto[]>(dispatch_products_base_path, {
      revalidate: 60,
      tags: [dispatch_products_tags.list()],
    });
  },

  async get_dispatch_product_by_id(id: number): Promise<DispatchProductDto> {
    return server_fetch.get<DispatchProductDto>(dispatch_product_by_id_path(id), {
      revalidate: 60,
      tags: [dispatch_products_tags.item(id)],
    });
  },

  async create_dispatch_product(payload: CreateDispatchProductDto): Promise<DispatchProductDto> {
    return server_fetch.post<DispatchProductDto>(dispatch_products_base_path, payload, {
      revalidate: false,
    });
  },

  async update_dispatch_product(payload: UpdateDispatchProductPayload): Promise<DispatchProductDto> {
    const { id, ...body } = payload;
    return server_fetch.put<DispatchProductDto>(dispatch_product_by_id_path(id), body, {
      revalidate: false,
    });
  },

  async delete_dispatch_product(payload: DeleteDispatchProductPayload): Promise<void> {
    return server_fetch.delete<void>(dispatch_product_by_id_path(payload.id), {
      revalidate: false,
    });
  },
} as const;
