import 'server-only';

import type { components } from '@/server/lib/essenza-openapi-types';

export type TrackingDto = components['schemas']['TrackingDto'];
export type CreateTrackingDto = components['schemas']['CreateTrackingDto'];
export type UpdateTrackingDto = components['schemas']['UpdateTrackingDto'];

export type DispatchDetailDto = components['schemas']['DispatchDetailDto'];
export type CreateDispatchDetailDto = components['schemas']['CreateDispatchDetailDto'];
export type UpdateDispatchDetailDto = components['schemas']['UpdateDispatchDetailDto'];

export type UpdateTrackingPayload = UpdateTrackingDto & { id: number };
export type UpdateDispatchDetailPayload = UpdateDispatchDetailDto & { id: number };
