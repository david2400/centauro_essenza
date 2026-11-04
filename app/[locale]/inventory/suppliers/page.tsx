/** @format */

import { unstable_rethrow } from 'next/navigation';
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { get_supplier_stats } from "@/server/domains/inventory/suppliers/queries";
import { search_suppliers } from "@/server/domains/inventory/suppliers/search";
import { parse_grid_query } from "@/server/lib/pagination";
import { SupplierManager } from "@/modules/inventory/supplier";
import { SUPPLIER_GRID } from "./grid";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  const tModule = await getTranslations({ locale, namespace: "Administre.supplier" });

  return {
    title: t("supplier"),
    description: tModule("description"),
  };
}

const SupplierPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const query = parse_grid_query(await searchParams, SUPPLIER_GRID);
  const [page, stats] = await Promise.all([search_suppliers(query), get_supplier_stats().catch((error) => { unstable_rethrow(error); return null; })]);

  return <SupplierManager page={page} stats={stats} />;
};

export default SupplierPage;
