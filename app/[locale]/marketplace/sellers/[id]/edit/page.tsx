/** @format */

import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { HiOutlineBuildingStorefront } from "react-icons/hi2";
import { PageHeader } from "@/components/page-header";
import { marketplace_repository } from "@/server/domains/marketplace/repository";
import { ServerApiError } from "@/server/lib/types";
import { SellerForm } from "@/modules/marketplace";

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  return { title: t("sellers") };
}

const EditSellerPage = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const sellerId = Number(id);
  if (!Number.isInteger(sellerId) || sellerId <= 0) notFound();
  const t = await getTranslations("Administre.marketplace.seller");
  const tCrud = await getTranslations("Crud");
  try {
    const seller = await marketplace_repository.get_seller(sellerId);
    return (
      <section className='flex w-full flex-col gap-6'>
        <PageHeader title={t("editTitle")} description={seller.trade_name ?? seller.legal_name} icon={HiOutlineBuildingStorefront} eyebrow={tCrud("domains.marketplace")} />
        <SellerForm seller={seller} />
      </section>
    );
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ServerApiError && error.status === 404) notFound();
    throw error;
  }
};

export default EditSellerPage;
