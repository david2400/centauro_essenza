/** @format */

import { unstable_rethrow } from 'next/navigation';
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { get_warehouse_stats } from "@/server/domains/inventory/warehouses/queries";
import { search_warehouses } from "@/server/domains/inventory/warehouses/search";
import { parse_grid_query } from "@/server/lib/pagination";
import { WarehouseManager } from "@/modules/inventory/warehouse";
import { WAREHOUSE_GRID } from "./grid";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  const tModule = await getTranslations({ locale, namespace: "Administre.warehouse" });
  return { title: t("warehouse"), description: tModule("description") };
}

const WarehousePage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const query = parse_grid_query(await searchParams, WAREHOUSE_GRID);
  const [page, stats] = await Promise.all([search_warehouses(query), get_warehouse_stats().catch((error) => { unstable_rethrow(error); return null; })]);
  return <WarehouseManager page={page} stats={stats} />;
};

export default WarehousePage;
