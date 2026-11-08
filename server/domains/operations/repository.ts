import 'server-only';

import { server_fetch } from '@/server/lib/server-fetch';
import type { AlertsDto } from './types';

/** Sin caché: son alertas de hoy y dependen de los permisos del token. */
export const operations_repository = {
  alerts: () => server_fetch.get<AlertsDto>('/api/shop/operations/alerts', { revalidate: 0 }),
};
