import { unstable_rethrow } from 'next/navigation';
import 'server-only';

import { cache } from 'react';

import { products_repository } from './repository';
import type { ProductDto, ProductFilter, UpdateProductPayload } from './types';
import { products_tags } from '@/server/lib/cache-tags';
import { server_fetch } from '@/server/lib/server-fetch';
import {
  collect_all_pages,
  is_missing_endpoint,
  paginate_in_memory,
  to_page_result,
} from '@/server/lib/pagination';
import { create_search_resource } from '@/server/lib/search-resource';
import { sortToParam, type BulkResult, type GridQuery, type PageResult } from '@/shared/models/pagination';

const products_base_path = '/api/shop/catalog/products';

const to_id_list = (value?: string) => (value ? [Number(value)].filter((id) => Number.isInteger(id) && id > 0) : undefined);

/** Traduce los filtros de la URL al `ProductFilter` del backend. */
function to_filter(query: GridQuery): ProductFilter {
  return {
    search: query.q || undefined,
    brand_ids: to_id_list(query.filters.brandId),
    category_ids: to_id_list(query.filters.categoryId),
    subcategory_ids: to_id_list(query.filters.subcategoryId),
    available: query.filters.available ? query.filters.available === 'true' : undefined,
    statuses: query.filters.status ? [query.filters.status] : undefined,
  };
}

/** Borrado en lote (con respaldo uno a uno: productos aún no tiene `/bulk-delete`). */
const products_bulk = create_search_resource<ProductDto>({
  base_path: products_base_path,
  list_tag: products_tags.list(),
  list_all: () => products_repository.list_products({ size: 200 }),
  delete_one: (id) => products_repository.delete_product({ id }),
  search_fields: (item) => [item.name, item.description],
});

/**
 * Búsqueda paginada de productos con el endpoint existente
 * `POST /catalog/products/search` (filtro en el cuerpo, página en la URL).
 */
async function search(query: GridQuery): Promise<PageResult<ProductDto>> {
  const params = new URLSearchParams({ page: String(query.page), size: String(query.size) });
  const sort = sortToParam(query.sort);
  if (sort) params.set('sort', sort);
  try {
    const response = await server_fetch.post<unknown>(`${products_base_path}/search?${params}`, to_filter(query), {
      revalidate: 30,
      tags: [products_tags.list()],
    });
    return to_page_result<ProductDto>(response, query.size);
  } catch (error) {
    unstable_rethrow(error);
    if (!is_missing_endpoint(error)) throw error;
    const all = await products_repository.list_products({ size: 200 });
    return paginate_in_memory(all, query, {
      search_fields: (item) => [item.name, item.description],
      filter_fields: {
        brandId: (item) => item.brand_id,
        categoryId: (item) => item.category_id,
        subcategoryId: (item) => item.subcategory_id,
        available: (item) => String(Boolean(item.available)),
        status: (item) => item.status ?? (item.available ? 'ACTIVE' : 'INACTIVE'),
      },
    });
  }
}

/** Cambia la disponibilidad de varios productos (PUT completo por producto). */
async function set_availability(ids: number[], available: boolean): Promise<BulkResult> {
  const unique = [...new Set(ids)];
  const failed: BulkResult['failed'] = [];
  let succeeded = 0;
  for (let index = 0; index < unique.length; index += 5) {
    const chunk = unique.slice(index, index + 5);
    const results = await Promise.allSettled(
      chunk.map(async (id) => {
        // El PUT exige el producto completo: se parte del registro actual.
        const current = await server_fetch.get<ProductDto>(`${products_base_path}/${id}`, { revalidate: false });
        await products_repository.update_product({ ...current, id, available } as UpdateProductPayload);
      }),
    );
    results.forEach((result, position) => {
      if (result.status === 'fulfilled') succeeded += 1;
      else
        failed.push({
          id: chunk[position] as number,
          reason: result.reason instanceof Error ? result.reason.message : 'Error',
        });
    });
  }
  return { requested: unique.length, succeeded, failed };
}

export const products_resource = {
  search,
  export_all: (query: GridQuery) => collect_all_pages<ProductDto>((page, size) => search({ ...query, page, size })),
  bulk_delete: products_bulk.bulk_delete,
  set_availability,
} as const;

export const search_products = cache(async (query: GridQuery) => search(query));
