/** @format */

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HiOutlineBuildingStorefront } from "react-icons/hi2";
import { PageHeader } from "@/components/page-header";
import { SellerForm } from "@/modules/marketplace";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  return { title: t("sellers") };
}

const NewSellerPage = async () => {
  const t = await getTranslations("Administre.marketplace.seller");
  const tCrud = await getTranslations("Crud");
  return (
    <section className='flex w-full flex-col gap-6'>
      <PageHeader title={t("createTitle")} description={t("createDescription")} icon={HiOutlineBuildingStorefront} eyebrow={tCrud("domains.marketplace")} />
      <SellerForm />
    </section>
  );
};

export default NewSellerPage;
