/** @format */

import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { marketplace_repository } from "@/server/domains/marketplace/repository";
import { get_marketplace_access } from "@/server/domains/marketplace/access";
import { ServerApiError } from "@/server/lib/types";
import { OfferDetail } from "@/modules/marketplace";

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  return { title: t("offers") };
}

const OfferDetailPage = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const offerId = Number(id);
  if (!Number.isInteger(offerId) || offerId <= 0) notFound();
  try {
    const [offer, access] = await Promise.all([marketplace_repository.get_offer(offerId), get_marketplace_access()]);
    return <OfferDetail offer={offer} access={access} />;
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ServerApiError && error.status === 404) notFound();
    throw error;
  }
};

export default OfferDetailPage;
