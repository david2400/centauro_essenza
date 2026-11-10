/** @format */

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { payouts_repository } from "@/server/domains/marketplace/payouts/repository";
import { get_marketplace_access } from "@/server/domains/marketplace/access";
import { PayoutManager } from "@/modules/marketplace";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  return { title: t("payouts") };
}

const PayoutsPage = async () => {
  const [preview, batches, access] = await Promise.all([payouts_repository.preview(), payouts_repository.recent(), get_marketplace_access()]);
  const [banks, formats] = access.billingManage
    ? await Promise.all([payouts_repository.banks(true), payouts_repository.formats(true)])
    : [[], []];
  return <PayoutManager preview={preview} batches={batches} banks={banks} formats={formats} canManage={access.billingManage} />;
};

export default PayoutsPage;
