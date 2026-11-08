import 'server-only';

import { auth } from '@/auth';
import { devSkipAuth } from '@/server/domains/marketplace/access';
import { get_capabilities } from '@/server/domains/session/capabilities';
import { SALES_PERMISSIONS, purchaseAccessFrom, type IPurchaseAccess } from './types';

/** Permisos para pintar acciones. Es solo presentación: draco valida cada operación con el token. */
export async function get_purchase_access(): Promise<IPurchaseAccess> {
  const capabilities = await get_capabilities();
  if (capabilities) return purchaseAccessFrom(capabilities);
  const session = await auth();
  if (!session && devSkipAuth()) return purchaseAccessFrom(Object.values(SALES_PERMISSIONS));
  return purchaseAccessFrom(session?.user?.permissions);
}
