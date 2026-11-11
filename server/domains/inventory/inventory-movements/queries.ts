import 'server-only';

import { cache } from 'react';

import { collect_all_pages } from '@/server/lib/pagination';
import type { GridQuery } from '@/shared/models/pagination';
import { inventory_movements_repository } from './repository';

/** Página del kardex (paginada y ordenada en el backend). */
export const search_inventory_movements = cache(async (query: GridQuery) =>
  inventory_movements_repository.search_inventory_movements(query),
);

/** Todas las páginas con el orden actual, para el CSV (corta en 10.000 filas). */
export const export_inventory_movements = (query: GridQuery) =>
  collect_all_pages((page, size) => inventory_movements_repository.search_inventory_movements({ ...query, page, size }));
