import 'server-only';

import { lookup_products, lookup_skus } from '@/server/domains/lookups/queries';
import type { InventoryMovementDto } from '@/server/domains/inventory/inventory-movements/types';
import type { IInventoryMovementRow } from '@/modules/inventory/inventoryMovement/models/inventory-movement.interface';

const distinct = (values: Array<number | undefined>) =>
  [...new Set(values.filter((value): value is number => value != null))];

/**
 * Agrega a cada movimiento el nombre del producto/variante y el código del SKU,
 * buscando solo los ids que aparecen en las filas recibidas (no el catálogo entero).
 * Si la búsqueda de nombres falla, la tabla sigue mostrando el id.
 */
export async function with_names(movements: InventoryMovementDto[]): Promise<IInventoryMovementRow[]> {
  const skuIds = distinct(movements.map((movement) => movement.sku_id));
  const legacyProductIds = distinct(
    movements.filter((movement) => movement.sku_id == null).map((movement) => movement.product_id),
  );
  const [skus, products] = await Promise.all([
    skuIds.length > 0 ? lookup_skus({ ids: skuIds }) : Promise.resolve([]),
    legacyProductIds.length > 0 ? lookup_products({ ids: legacyProductIds }) : Promise.resolve([]),
  ]);

  const skuById = new Map(skus.map((sku) => [sku.sku_id, sku]));
  const productById = new Map(products.map((product) => [product.id, product.name]));

  return movements.map((movement) => {
    const sku = movement.sku_id != null ? skuById.get(movement.sku_id) : undefined;
    return {
      ...movement,
      product_name: sku?.name ?? (movement.product_id != null ? productById.get(movement.product_id) : undefined),
      sku_code: sku?.code,
    };
  });
}
