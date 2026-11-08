/** @format */

import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { purchases_repository } from "@/server/domains/sales/purchases/repository";
import { ServerApiError } from "@/server/lib/types";
import { PurchaseDetail } from "@/modules/ventas/purchase";

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  return { title: t("purchases") };
}

const PurchaseDetailPage = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const purchaseId = Number(id);
  if (!Number.isInteger(purchaseId) || purchaseId <= 0) notFound();
  try {
    return <PurchaseDetail purchase={await purchases_repository.get(purchaseId)} />;
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ServerApiError && error.status === 404) notFound();
    throw error;
  }
};

export default PurchaseDetailPage;
