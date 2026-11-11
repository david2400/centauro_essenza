import 'server-only';

import { server_fetch } from '@/server/lib/server-fetch';
import { to_page_result, to_search_params } from '@/server/lib/pagination';
import { inventory_movements_tags } from '@/server/lib/cache-tags';
import type { GridQuery, PageResult } from '@/shared/models/pagination';
import type { InventoryMovementDto } from './types';

const inventory_movements_transfer_path = '/api/shop/inventory/stock/movements/transfer';
const inventory_movements_exit_path = '/api/shop/inventory/stock/movements/exit';
const inventory_movements_entry_path = '/api/shop/inventory/stock/movements/entry';
const inventory_movements_base_path = '/api/shop/inventory/stock/movements';

export const inventory_movements_repository = {
  /**
   * Una página del kardex. El backend (`GET /movements`, `Pageable` de Spring) pagina y ordena,
   * pero todavía no filtra ni busca: `q` y los filtros no se envían.
   */
  async search_inventory_movements(query: GridQuery): Promise<PageResult<InventoryMovementDto>> {
    const params = to_search_params({ ...query, q: '', filters: {} });
    const response = await server_fetch.get<unknown>(`${inventory_movements_base_path}?${params}`, {
      revalidate: 30,
      tags: [inventory_movements_tags.list()],
    });
    return to_page_result<InventoryMovementDto>(response, query.size);
  },

  async transfer_inventory(payload: InventoryMovementDto): Promise<InventoryMovementDto> {
    return server_fetch.post<InventoryMovementDto>(inventory_movements_transfer_path, payload, {
      revalidate: false,
      tags: [inventory_movements_tags.transfers()],
    });
  },

  async exit_inventory(payload: InventoryMovementDto): Promise<InventoryMovementDto> {
    return server_fetch.post<InventoryMovementDto>(inventory_movements_exit_path, payload, {
      revalidate: false,
      tags: [inventory_movements_tags.exits()],
    });
  },

  async entry_inventory(payload: InventoryMovementDto): Promise<InventoryMovementDto> {
    return server_fetch.post<InventoryMovementDto>(inventory_movements_entry_path, payload, {
      revalidate: false,
      tags: [inventory_movements_tags.entries()],
    });
  },
} as const;
