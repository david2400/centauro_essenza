/** @format */

import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { marketplace_repository } from "@/server/domains/marketplace/repository";
import { get_marketplace_access } from "@/server/domains/marketplace/access";
import { parse_grid_query } from "@/server/lib/pagination";
import { BillingManager } from "@/modules/marketplace";
import { COMMISSION_GRID } from "./grid";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  const tModule = await getTranslations({ locale, namespace: "Administre.marketplace.billing" });
  return { title: t("sellerBilling"), description: tModule("description") };
}

const BillingPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const query = parse_grid_query(await searchParams, COMMISSION_GRID);
  const sellerId = Number(query.filters.sellerId);
  const bySeller = Number.isInteger(sellerId) && sellerId > 0 ? sellerId : undefined;
  if (!bySeller) delete query.filters.sellerId;
  const [page, summary, access, seller] = await Promise.all([
    marketplace_repository.search_commissions(query),
    marketplace_repository.billing_summary().catch((error) => { unstable_rethrow(error); return null; }),
    get_marketplace_access(),
    bySeller ? marketplace_repository.get_seller(bySeller).catch((error) => { unstable_rethrow(error); return null; }) : null,
  ]);
  const sellerName = bySeller ? (seller?.trade_name ?? seller?.legal_name ?? `#${bySeller}`) : null;
  return <BillingManager page={page} summary={summary} access={access} sellerName={sellerName} />;
};

export default BillingPage;
