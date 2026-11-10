/** @format */

import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { payouts_repository } from "@/server/domains/marketplace/payouts/repository";
import { ServerApiError } from "@/server/lib/types";
import { PayoutDetail } from "@/modules/marketplace";

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  return { title: t("payouts") };
}

const PayoutBatchPage = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const batchId = Number(id);
  if (!Number.isInteger(batchId) || batchId <= 0) notFound();
  try {
    const [batch, formats] = await Promise.all([
      payouts_repository.get(batchId),
      payouts_repository.formats().catch((error) => { unstable_rethrow(error); return []; }),
    ]);
    return <PayoutDetail batch={batch} formats={formats} />;
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ServerApiError && error.status === 404) notFound();
    throw error;
  }
};

export default PayoutBatchPage;
