import 'server-only';

import { server_fetch } from '@/server/lib/server-fetch';
import { shipping_costs_tags } from '@/server/lib/cache-tags';
import type {
  ShippingCostDto,
  CreateShippingCostDto,
  UpdateShippingCostPayload,
} from './types';

const shipping_costs_base_path = '/api/shop/product_distribution/shipping_costs';
const shipping_cost_by_id_path = (id: number) => `${shipping_costs_base_path}/${id}`;

export const shipping_costs_repository = {
  async list_shipping_costs(): Promise<ShippingCostDto[]> {
    return server_fetch.get<ShippingCostDto[]>(shipping_costs_base_path, {
      revalidate: 60,
      tags: [shipping_costs_tags.list()],
    });
  },

  async get_shipping_cost_by_id(id: number): Promise<ShippingCostDto> {
    return server_fetch.get<ShippingCostDto>(shipping_cost_by_id_path(id), {
      revalidate: 60,
      tags: [shipping_costs_tags.item(id)],
    });
  },

  async create_shipping_cost(payload: CreateShippingCostDto): Promise<ShippingCostDto> {
    return server_fetch.post<ShippingCostDto>(shipping_costs_base_path, payload, {
      revalidate: false,
    });
  },

  async update_shipping_cost(payload: UpdateShippingCostPayload): Promise<ShippingCostDto> {
    return server_fetch.put<ShippingCostDto>(shipping_cost_by_id_path(payload.id), payload, {
      revalidate: false,
    });
  },

  async delete_shipping_cost(id: number): Promise<void> {
    return server_fetch.delete<void>(shipping_cost_by_id_path(id), {
      revalidate: false,
    });
  },
} as const;
