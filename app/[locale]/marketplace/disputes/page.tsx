/** @format */

import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { disputes_repository } from "@/server/domains/marketplace/disputes/repository";
import { parse_grid_query } from "@/server/lib/pagination";
import { DisputeManager } from "@/modules/marketplace";
import { DISPUTE_GRID } from "./grid";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  const tModule = await getTranslations({ locale, namespace: "Administre.marketplace.dispute" });
  return { title: t("disputes"), description: tModule("description") };
}

const DisputesPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const query = parse_grid_query(await searchParams, DISPUTE_GRID);
  const [page, stats] = await Promise.all([
    disputes_repository.search(query),
    disputes_repository.stats().catch((error) => { unstable_rethrow(error); return null; }),
  ]);
  return <DisputeManager page={page} stats={stats} />;
};

export default DisputesPage;
