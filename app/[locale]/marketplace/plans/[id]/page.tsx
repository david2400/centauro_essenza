/** @format */

import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { marketplace_repository } from "@/server/domains/marketplace/repository";
import { get_marketplace_access } from "@/server/domains/marketplace/access";
import { ServerApiError } from "@/server/lib/types";
import { PlanDetail } from "@/modules/marketplace";

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  return { title: t("plans") };
}

const PlanDetailPage = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const planId = Number(id);
  if (!Number.isInteger(planId) || planId <= 0) notFound();
  try {
    const [plan, access] = await Promise.all([marketplace_repository.get_plan(planId), get_marketplace_access()]);
    return <PlanDetail plan={plan} access={access} />;
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ServerApiError && error.status === 404) notFound();
    throw error;
  }
};

export default PlanDetailPage;
