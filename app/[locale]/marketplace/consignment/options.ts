import 'server-only';

import { unstable_rethrow } from 'next/navigation';
import { consignment_repository } from '@/server/domains/marketplace/consignment/repository';
import type { ConsignmentOptionsDto } from '@/server/domains/marketplace/consignment/types';

/** Vendedores y bodegas para filtros y formularios; si fallan, los filtros quedan vacíos. */
export const load_consignment_options = (): Promise<ConsignmentOptionsDto> =>
  consignment_repository.options().catch((error) => {
    unstable_rethrow(error);
    return { sellers: [], warehouses: [] };
  });
