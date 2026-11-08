/** @format */

import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { disputes_repository } from "@/server/domains/marketplace/disputes/repository";
import { ServerApiError } from "@/server/lib/types";
import { DisputeDetail } from "@/modules/marketplace";

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  return { title: t("disputes") };
}

const DisputePage = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const disputeId = Number(id);
  if (!Number.isInteger(disputeId) || disputeId <= 0) notFound();
  try {
    const dispute = await disputes_repository.get(disputeId);
    return <DisputeDetail dispute={dispute} />;
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ServerApiError && error.status === 404) notFound();
    throw error;
  }
};

export default DisputePage;
