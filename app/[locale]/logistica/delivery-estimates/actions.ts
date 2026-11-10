'use server';

import { delete_delivery_estimate_action } from '@/server/domains/shipping_logistics/product_distribution/delivery-estimates/actions';

/**
 * Server actions de la ruta. Devuelven el resultado en lugar de lanzar,
 * para que la UI pueda mostrar el motivo real del error.
 */
type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

const fail = (error: string | undefined, fallback: string): ActionResult<never> => ({
  success: false,
  error: error ?? fallback,
});

export async function deleteDeliveryEstimateServerAction(id: number): Promise<ActionResult> {
  const result = await delete_delivery_estimate_action(id);
  return result.success ? { success: true } : fail(result.error, 'No se pudo eliminar el registro');
}
