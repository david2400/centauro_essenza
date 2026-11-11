import 'server-only';

import type { components } from '@/server/lib/essenza-openapi-types';

export type CashRegisterDto = components['schemas']['CashRegisterDto'];
export type SaveCashRegisterDto = components['schemas']['SaveCashRegisterDto'];
export type CashSessionDto = components['schemas']['CashSessionDto'];
export type CashSessionMethodDto = components['schemas']['CashSessionMethodDto'];
export type CashMovementDto = components['schemas']['CashMovementDto'];
export type OpenCashSessionDto = components['schemas']['OpenCashSessionDto'];
export type CashierDto = components['schemas']['CashierDto'];
export type CloseCashSessionDto = components['schemas']['CloseCashSessionDto'];
export type CreateCashMovementDto = components['schemas']['CreateCashMovementDto'];
export type PosCheckoutDto = components['schemas']['PosCheckoutDto'];
export type PosCheckoutResultDto = components['schemas']['PosCheckoutResultDto'];
export type StoreDto = components['schemas']['StoreDto'];
export type SaveStoreDto = components['schemas']['SaveStoreDto'];
