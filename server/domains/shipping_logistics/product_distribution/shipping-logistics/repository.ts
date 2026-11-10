import 'server-only';

import { server_fetch } from '@/server/lib/server-fetch';
import { shipping_logistics_tags } from '@/server/lib/cache-tags';
import type { ListParams } from '@/server/lib/types';
import type {
  TrackingDto,
  CreateTrackingDto,
  UpdateTrackingPayload,
  DispatchDetailDto,
  CreateDispatchDetailDto,
  UpdateDispatchDetailPayload,
} from './types';

const trackings_base_path = '/api/shop/shipping_logistics/trackings';
const dispatch_details_base_path = '/api/shop/shipping_logistics/dispatch_details';

export const shipping_logistics_repository = {
  async list_trackings(params?: ListParams): Promise<TrackingDto[]> {
    return server_fetch.get<TrackingDto[]>(trackings_base_path, {
      params,
      revalidate: 60,
      tags: [shipping_logistics_tags.trackings()],
    });
  },

  async get_tracking_by_id(id: number): Promise<TrackingDto> {
    return server_fetch.get<TrackingDto>(`${trackings_base_path}/${id}`, {
      revalidate: 60,
      tags: [shipping_logistics_tags.tracking(id)],
    });
  },

  async create_tracking(payload: CreateTrackingDto): Promise<TrackingDto> {
    return server_fetch.post<TrackingDto>(trackings_base_path, payload, {
      revalidate: false,
    });
  },

  async update_tracking(payload: UpdateTrackingPayload): Promise<TrackingDto> {
    return server_fetch.put<TrackingDto>(`${trackings_base_path}/${payload.id}`, payload, {
      revalidate: false,
    });
  },

  async delete_tracking(id: number): Promise<void> {
    return server_fetch.delete<void>(`${trackings_base_path}/${id}`, {
      revalidate: false,
    });
  },

  async list_dispatch_details(params?: ListParams): Promise<DispatchDetailDto[]> {
    return server_fetch.get<DispatchDetailDto[]>(dispatch_details_base_path, {
      params,
      revalidate: 60,
      tags: [shipping_logistics_tags.dispatch_details()],
    });
  },

  async get_dispatch_detail_by_id(id: number): Promise<DispatchDetailDto> {
    return server_fetch.get<DispatchDetailDto>(`${dispatch_details_base_path}/${id}`, {
      revalidate: 60,
      tags: [shipping_logistics_tags.dispatch_detail(id)],
    });
  },

  async create_dispatch_detail(payload: CreateDispatchDetailDto): Promise<DispatchDetailDto> {
    return server_fetch.post<DispatchDetailDto>(dispatch_details_base_path, payload, {
      revalidate: false,
    });
  },

  async update_dispatch_detail(
    payload: UpdateDispatchDetailPayload,
  ): Promise<DispatchDetailDto> {
    return server_fetch.put<DispatchDetailDto>(`${dispatch_details_base_path}/${payload.id}`, payload, {
      revalidate: false,
    });
  },

  async delete_dispatch_detail(id: number): Promise<void> {
    return server_fetch.delete<void>(`${dispatch_details_base_path}/${id}`, {
      revalidate: false,
    });
  },
} as const;
