import 'server-only';

import type { components } from '@/server/lib/essenza-openapi-types';

export type ShippingCostDto = components['schemas']['ShippingCostDto'];
export type CreateShippingCostDto = components['schemas']['CreateShippingCostDto'];
export type UpdateShippingCostDto = components['schemas']['UpdateShippingCostDto'];

export type UpdateShippingCostPayload = UpdateShippingCostDto & { id: number };
