/** @format */

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { purchases_repository } from "@/server/domains/sales/purchases/repository";
import { get_purchase_access } from "@/server/domains/sales/purchases/access";
import { parse_grid_query } from "@/server/lib/pagination";
import { PurchaseManager } from "@/modules/ventas/purchase";
import { PURCHASE_GRID } from "./grid";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  const tModule = await getTranslations({ locale, namespace: "Administre.purchase" });
  return { title: t("purchases"), description: tModule("description") };
}

const PurchasesPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const query = parse_grid_query(await searchParams, PURCHASE_GRID);
  const [page, access] = await Promise.all([purchases_repository.search(query), get_purchase_access()]);
  return <PurchaseManager page={page} canManage={access.manage} />;
};

export default PurchasesPage;
