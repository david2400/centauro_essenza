/** @format */

import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { marketplace_repository } from "@/server/domains/marketplace/repository";
import { get_marketplace_access } from "@/server/domains/marketplace/access";
import { payouts_repository } from "@/server/domains/marketplace/payouts/repository";
import { ServerApiError } from "@/server/lib/types";
import { SellerDetail } from "@/modules/marketplace";

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  return { title: t("sellers") };
}

const SellerDetailPage = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const sellerId = Number(id);
  if (!Number.isInteger(sellerId) || sellerId <= 0) notFound();
  try {
    const [seller, access] = await Promise.all([marketplace_repository.get_seller(sellerId), get_marketplace_access()]);
    // Estado de cuenta solo para externos y con permiso (si su API falla, la ficha funciona igual).
    const account = seller.kind === "EXTERNAL" && access.billingView
      ? await marketplace_repository.seller_account(sellerId).catch((error) => { unstable_rethrow(error); return null; })
      : null;
    const bankAccount = seller.kind === "EXTERNAL" && access.billingView
      ? await payouts_repository.bank_account(sellerId).catch((error) => { unstable_rethrow(error); return null; })
      : null;
    const banks = seller.kind === "EXTERNAL" && access.billingManage
      ? await payouts_repository.banks().catch((error) => { unstable_rethrow(error); return []; })
      : [];
    return <SellerDetail seller={seller} access={access} account={account} bankAccount={bankAccount} banks={banks} />;
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ServerApiError && error.status === 404) notFound();
    throw error;
  }
};

export default SellerDetailPage;
