/** @format */

import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { marketplace_repository } from "@/server/domains/marketplace/repository";
import { get_marketplace_access } from "@/server/domains/marketplace/access";
import { parse_grid_query } from "@/server/lib/pagination";
import { OfferManager } from "@/modules/marketplace";
import { OFFER_GRID } from "./grid";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  const tModule = await getTranslations({ locale, namespace: "Administre.marketplace.offer" });
  return { title: t("offers"), description: tModule("description") };
}

const OffersPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const query = parse_grid_query(await searchParams, OFFER_GRID);
  const sellerId = Number(query.filters.sellerId);
  const bySeller = Number.isInteger(sellerId) && sellerId > 0 ? sellerId : undefined;
  if (!bySeller) delete query.filters.sellerId;
  const [page, stats, access, seller] = await Promise.all([
    marketplace_repository.search_offers(query),
    marketplace_repository.offer_stats(bySeller).catch((error) => { unstable_rethrow(error); return null; }),
    get_marketplace_access(),
    bySeller ? marketplace_repository.get_seller(bySeller).catch((error) => { unstable_rethrow(error); return null; }) : null,
  ]);
  const sellerName = bySeller ? (seller?.trade_name ?? seller?.legal_name ?? `#${bySeller}`) : null;
  return <OfferManager page={page} stats={stats} canManage={access.offersManage} sellerName={sellerName} />;
};

export default OffersPage;
