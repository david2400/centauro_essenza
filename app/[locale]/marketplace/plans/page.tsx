/** @format */

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { marketplace_repository } from "@/server/domains/marketplace/repository";
import { get_marketplace_access } from "@/server/domains/marketplace/access";
import { parse_grid_query } from "@/server/lib/pagination";
import { PlanManager } from "@/modules/marketplace";
import { PLAN_GRID } from "./grid";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  const tModule = await getTranslations({ locale, namespace: "Administre.marketplace.plan" });
  return { title: t("plans"), description: tModule("description") };
}

const PlansPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const query = parse_grid_query(await searchParams, PLAN_GRID);
  const [page, access] = await Promise.all([marketplace_repository.search_plans(query), get_marketplace_access()]);
  return <PlanManager page={page} canManage={access.plansManage} />;
};

export default PlansPage;
