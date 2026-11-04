/** @format */

import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  get_warehouse,
  get_warehouse_links,
  get_warehouse_movements,
  get_warehouse_stock,
  list_warehouse_locations,
} from "@/server/domains/inventory/warehouses/queries";
import { ServerApiError } from "@/server/lib/types";
import { WarehouseDetailScene } from "@/modules/inventory/warehouse";

type Params = Promise<{ locale: string; id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  return { title: t("warehouse") };
}

/** Ficha de la bodega. La tabla de existencias lee q, below y page de la URL (paginación en el servidor). */
const WarehouseDetailPage = async ({ params, searchParams }: { params: Params; searchParams: SearchParams }) => {
  const { id } = await params;
  const warehouseId = Number(id);
  if (!Number.isInteger(warehouseId) || warehouseId <= 0) notFound();
  const search = await searchParams;
  const page = Math.max(0, (Number(first(search.page)) || 1) - 1);
  const stockQuery = {
    q: (first(search.q) ?? "").trim().slice(0, 80) || undefined,
    below_min: first(search.below) === "1",
    page,
    size: 20,
    sort: first(search.sort) || undefined,
  };
  try {
    const [warehouse, stock, movements, links, locations] = await Promise.all([
      get_warehouse({ id: warehouseId }),
      get_warehouse_stock(warehouseId, stockQuery),
      get_warehouse_movements(warehouseId),
      get_warehouse_links(warehouseId),
      list_warehouse_locations(warehouseId),
    ]);
    return (
      <WarehouseDetailScene
        warehouse={warehouse}
        stock={stock}
        stockQuery={{ q: stockQuery.q ?? "", belowMin: stockQuery.below_min }}
        movements={movements}
        links={links}
        locations={locations}
      />
    );
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ServerApiError && error.status === 404) notFound();
    throw error;
  }
};

export default WarehouseDetailPage;
