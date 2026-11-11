/** @format */

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { search_inventory_movements } from "@/server/domains/inventory/inventory-movements/queries";
import { list_all_warehouses } from "@/server/domains/inventory/warehouses/queries";
import { parse_grid_query } from "@/server/lib/pagination";
import { InventoryMovementManager } from "@/modules/inventory/inventoryMovement";
import { INVENTORY_MOVEMENT_GRID } from "./grid";
import { with_names } from "./rows";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  const tModule = await getTranslations({ locale, namespace: "Administre.inventoryMovement" });
  return { title: t("inventoryMovement"), description: tModule("description") };
}

/**
 * Kardex paginado en el backend: solo se trae la página visible (20 filas por defecto)
 * y solo se resuelven los nombres de los SKU/productos de esa página.
 */
const InventoryMovementsPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const query = parse_grid_query(await searchParams, INVENTORY_MOVEMENT_GRID);
  const [page, warehouses] = await Promise.all([search_inventory_movements(query), list_all_warehouses()]);
  const items = await with_names(page.items);

  return (
    <InventoryMovementManager
      page={{ ...page, items }}
      warehouses={warehouses.map(({ id, name, code }) => ({ id, name: code ? `${code} · ${name}` : name }))}
    />
  );
};

export default InventoryMovementsPage;
