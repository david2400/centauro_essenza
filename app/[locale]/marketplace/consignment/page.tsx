/** @format */

import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { consignment_repository } from "@/server/domains/marketplace/consignment/repository";
import { get_marketplace_access } from "@/server/domains/marketplace/access";
import { parse_grid_query } from "@/server/lib/pagination";
import { ConsignmentManager } from "@/modules/marketplace";
import { CONSIGNMENT_GRID } from "./grid";
import { load_consignment_options } from "./options";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  const tModule = await getTranslations({ locale, namespace: "Administre.marketplace.consignment" });
  return { title: t("consignment"), description: tModule("description") };
}

const ConsignmentPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const query = parse_grid_query(await searchParams, CONSIGNMENT_GRID);
  const [page, stats, options, access] = await Promise.all([
    consignment_repository.stock(query),
    consignment_repository.stats().catch((error) => { unstable_rethrow(error); return null; }),
    load_consignment_options(),
    get_marketplace_access(),
  ]);
  return <ConsignmentManager page={page} stats={stats} options={options} canManage={access.consignmentManage} />;
};

export default ConsignmentPage;
