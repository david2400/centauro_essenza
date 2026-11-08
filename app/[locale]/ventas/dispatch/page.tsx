/** @format */

import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { dispatch_repository } from "@/server/domains/sales/dispatch/repository";
import { get_purchase_access } from "@/server/domains/sales/purchases/access";
import { parse_grid_query } from "@/server/lib/pagination";
import { DispatchManager } from "@/modules/ventas/dispatch";
import { DISPATCH_GRID } from "./grid";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  const tModule = await getTranslations({ locale, namespace: "Administre.dispatchBoard" });
  return { title: t("dispatchBoard"), description: tModule("description") };
}

const DispatchPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const query = parse_grid_query(await searchParams, DISPATCH_GRID);
  // Los indicadores son un bloque aparte: si fallan, el tablero funciona igual.
  const [page, stats, access] = await Promise.all([
    dispatch_repository.search(query),
    dispatch_repository.stats().catch((error) => { unstable_rethrow(error); return null; }),
    get_purchase_access(),
  ]);
  return <DispatchManager page={page} stats={stats} canManage={access.manage} />;
};

export default DispatchPage;
