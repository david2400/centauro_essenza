import 'server-only';

import { cache } from 'react';
import { unstable_rethrow } from 'next/navigation';
import { server_fetch } from '@/server/lib/server-fetch';

/**
 * Acciones que draco concede al usuario actual según sus reglas configurables
 * (essenza.authorization.rules), no según nombres de permisos fijos en el panel. Una sola
 * consulta por petición. {@code null} si draco no respondió: entonces se usan los permisos de la
 * sesión como respaldo. Mostrar u ocultar botones es solo presentación: draco valida cada operación.
 */
export const get_capabilities = cache(async (): Promise<string[] | null> => {
  try {
    const response = await server_fetch.get<{ capabilities?: string[] }>('/api/shop/me/capabilities', { revalidate: 0 });
    return Array.isArray(response?.capabilities) ? response.capabilities : null;
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
});
