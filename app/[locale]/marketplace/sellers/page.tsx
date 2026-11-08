/** @format */

import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { marketplace_repository } from "@/server/domains/marketplace/repository";
import { get_marketplace_access } from "@/server/domains/marketplace/access";
import { parse_grid_query } from "@/server/lib/pagination";
import { SellerManager } from "@/modules/marketplace";
import { SELLER_GRID } from "./grid";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  const tModule = await getTranslations({ locale, namespace: "Administre.marketplace.seller" });
  return { title: t("sellers"), description: tModule("description") };
}

const SellersPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const query = parse_grid_query(await searchParams, SELLER_GRID);
  const [page, stats, access] = await Promise.all([
    marketplace_repository.search_sellers(query),
    marketplace_repository.seller_stats().catch((error) => { unstable_rethrow(error); return null; }),
    get_marketplace_access(),
  ]);
  return <SellerManager page={page} stats={stats} canManage={access.sellersManage} />;
};

export default SellersPage;
