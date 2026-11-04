'use server';

import { unstable_rethrow } from 'next/navigation';
import { lookups_repository } from './repository';
import type {
  LookupOptionDto,
  LookupParams,
  ProductLookupDto,
  ProductLookupParams,
  SkuLookupDto,
  SkuLookupParams,
  SubcategoryLookupParams,
} from './types';
import { ServerApiError } from '@/server/lib/types';

/**
 * Búsquedas para los selectores asíncronos (combobox) de los Client Components.
 * Devuelven el resultado en lugar de lanzar, para mostrar el error en el selector.
 */
export type LookupResult<T> = { success: true; data: T[] } | { success: false; error: string };

async function run<T>(load: () => Promise<T[]>): Promise<LookupResult<T>> {
  try {
    return { success: true, data: await load() };
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof ServerApiError || error instanceof Error ? error.message : 'Unexpected error';
    return { success: false, error: message };
  }
}

export async function lookup_skus_action(params: SkuLookupParams): Promise<LookupResult<SkuLookupDto>> {
  return run(() => lookups_repository.skus(params));
}

export async function lookup_products_action(params: ProductLookupParams): Promise<LookupResult<ProductLookupDto>> {
  return run(() => lookups_repository.products(params));
}

export async function lookup_brands_action(params: LookupParams): Promise<LookupResult<LookupOptionDto>> {
  return run(() => lookups_repository.brands(params));
}

export async function lookup_categories_action(params: LookupParams): Promise<LookupResult<LookupOptionDto>> {
  return run(() => lookups_repository.categories(params));
}

export async function lookup_subcategories_action(
  params: SubcategoryLookupParams,
): Promise<LookupResult<LookupOptionDto>> {
  return run(() => lookups_repository.subcategories(params));
}

export async function lookup_suppliers_action(params: LookupParams): Promise<LookupResult<LookupOptionDto>> {
  return run(() => lookups_repository.suppliers(params));
}
