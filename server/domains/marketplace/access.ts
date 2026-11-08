import 'server-only';

import { auth } from '@/auth';
import { get_capabilities } from '@/server/domains/session/capabilities';
import { MARKETPLACE_PERMISSIONS, accessFrom, type IMarketplaceAccess } from './types';

/**
 * Desarrollo local sin login (DEV_SKIP_AUTH=1, nunca en producción): sin sesión se muestran todas
 * las acciones, igual que el usuario "dev" de draco con MARKETPLACE_DEV_COMPANY_ID. Es solo
 * presentación: draco decide cada operación.
 */
export const devSkipAuth = () => process.env.DEV_SKIP_AUTH === '1' && process.env.NODE_ENV !== 'production';

/**
 * Permisos del usuario para pintar u ocultar acciones. Es solo presentación: draco vuelve a
 * validar cada operación con el token.
 */
export async function get_marketplace_access(): Promise<IMarketplaceAccess> {
  const capabilities = await get_capabilities();
  if (capabilities) return accessFrom(capabilities);
  const session = await auth();
  if (!session && devSkipAuth()) return accessFrom(Object.values(MARKETPLACE_PERMISSIONS));
  return accessFrom(session?.user?.permissions);
}
