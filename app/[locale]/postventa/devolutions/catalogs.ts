import 'server-only';

import { list_motive_devolutions } from '@/server/domains/devolution/motive-devolutions/queries';
import { list_return_methods } from '@/server/domains/devolution/return-methods/queries';
import { list_refund_methods } from '@/server/domains/devolution/refund-methods/queries';

/**
 * Catálogos que comparten el listado y el detalle de devoluciones.
 * Los métodos inactivos se ocultan del formulario pero se conservan para
 * poder mostrar el nombre en devoluciones antiguas.
 */
export async function load_devolution_catalogs() {
  const [motives, returnMethods, refundMethods] = await Promise.all([
    list_motive_devolutions(),
    list_return_methods(),
    list_refund_methods(),
  ]);

  return {
    motives: motives.map(({ id, name }) => ({ id, name })),
    returnMethods: returnMethods.map(({ id, name, active }) => ({ id, name, active: active !== false })),
    refundMethods: refundMethods.map(({ id, name, active }) => ({ id, name, active: active !== false })),
  };
}
