import 'server-only';

import { server_fetch } from '@/server/lib/server-fetch';
import { delivery_estimates_tags } from '@/server/lib/cache-tags';
import type {
  DeliveryEstimateDto,
  CreateDeliveryEstimateDto,
  UpdateDeliveryEstimatePayload,
} from './types';

const delivery_estimates_base_path = '/api/shop/product_distribution/delivery_estimates';
const delivery_estimate_by_id_path = (id: number) => `${delivery_estimates_base_path}/${id}`;

export const delivery_estimates_repository = {
  async list_delivery_estimates(): Promise<DeliveryEstimateDto[]> {
    return server_fetch.get<DeliveryEstimateDto[]>(delivery_estimates_base_path, {
      revalidate: 60,
      tags: [delivery_estimates_tags.list()],
    });
  },

  async get_delivery_estimate_by_id(id: number): Promise<DeliveryEstimateDto> {
    return server_fetch.get<DeliveryEstimateDto>(delivery_estimate_by_id_path(id), {
      revalidate: 60,
      tags: [delivery_estimates_tags.item(id)],
    });
  },

  async create_delivery_estimate(payload: CreateDeliveryEstimateDto): Promise<DeliveryEstimateDto> {
    return server_fetch.post<DeliveryEstimateDto>(delivery_estimates_base_path, payload, {
      revalidate: false,
    });
  },

  async update_delivery_estimate(
    payload: UpdateDeliveryEstimatePayload,
  ): Promise<DeliveryEstimateDto> {
    return server_fetch.put<DeliveryEstimateDto>(delivery_estimate_by_id_path(payload.id), payload, {
      revalidate: false,
    });
  },

  async delete_delivery_estimate(id: number): Promise<void> {
    return server_fetch.delete<void>(delivery_estimate_by_id_path(id), {
      revalidate: false,
    });
  },
} as const;
