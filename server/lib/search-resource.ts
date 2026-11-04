import { unstable_rethrow } from 'next/navigation';
import 'server-only';

import { server_fetch } from './server-fetch';
import {
  collect_all_pages,
  is_missing_endpoint,
  paginate_in_memory,
  to_page_result,
  to_search_params,
  type InMemoryOptions,
} from './pagination';
import type { BulkResult, GridQuery, PageResult } from '@/shared/models/pagination';

export interface SearchResourceConfig<T extends object> extends InMemoryOptions<T> {
  /** Ruta base del recurso, p. ej. `/api/shop/catalog/brands`. */
  base_path: string;
  /** Tag de listado: se revalida en cada alta/edición/baja. */
  list_tag: string;
  /** Lista completa (respaldo si el backend no tiene `/search`). */
  list_all: () => Promise<T[]>;
  /** Borrado individual (respaldo si el backend no tiene `/bulk-delete`). */
  delete_one: (id: number) => Promise<void>;
}

/**
 * Capacidades "enterprise" comunes de un recurso del API:
 *
 *  - `search`: paginación, búsqueda y orden en el backend (`GET /search`).
 *  - `export_all`: todas las páginas que cumplen el filtro (para CSV).
 *  - `bulk_delete`: borrado en lote (`POST /bulk-delete`).
 *
 * Si el backend desplegado todavía no tiene esos endpoints (404/405), cada
 * función cae a un respaldo equivalente — búsqueda en memoria o borrados
 * uno a uno — para que la pantalla funcione mientras se recompila.
 */
export function create_search_resource<T extends object>(config: SearchResourceConfig<T>) {
  async function search(query: GridQuery): Promise<PageResult<T>> {
    try {
      const response = await server_fetch.get<unknown>(`${config.base_path}/search?${to_search_params(query)}`, {
        revalidate: 30,
        tags: [config.list_tag],
      });
      return to_page_result<T>(response, query.size);
    } catch (error) {
      unstable_rethrow(error);
      if (!is_missing_endpoint(error)) throw error;
      return paginate_in_memory(await config.list_all(), query, config);
    }
  }

  async function export_all(query: GridQuery) {
    return collect_all_pages<T>((page, size) => search({ ...query, page, size }));
  }

  async function bulk_delete(ids: number[]): Promise<BulkResult> {
    const unique = [...new Set(ids)].filter((id) => Number.isInteger(id) && id > 0);
    try {
      return await server_fetch.post<BulkResult>(`${config.base_path}/bulk-delete`, { ids: unique }, {
        revalidate: false,
      });
    } catch (error) {
      unstable_rethrow(error);
      if (!is_missing_endpoint(error)) throw error;
      // Respaldo: uno a uno, de a 5 en paralelo para no saturar el backend.
      const failed: BulkResult['failed'] = [];
      let succeeded = 0;
      for (let index = 0; index < unique.length; index += 5) {
        const chunk = unique.slice(index, index + 5);
        const results = await Promise.allSettled(chunk.map((id) => config.delete_one(id)));
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
  }

  return { search, export_all, bulk_delete } as const;
}
