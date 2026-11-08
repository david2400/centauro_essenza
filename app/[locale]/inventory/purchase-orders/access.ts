import 'server-only';

import { get_capabilities } from '@/server/domains/session/capabilities';

/** Presentación: qué botones mostrar. draco valida cada operación con el token. */
export async function purchase_access() {
  const capabilities = await get_capabilities();
  const has = (key: string) => capabilities == null || capabilities.includes(key);
  return { manage: has('COMPRAS.GESTIONAR'), receive: has('COMPRAS.RECIBIR') };
}
