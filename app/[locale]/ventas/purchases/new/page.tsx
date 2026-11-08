/** @format */

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HiOutlineShoppingBag } from "react-icons/hi2";
import { PageHeader } from "@/components/page-header";
import { PurchaseForm } from "@/modules/ventas/purchase";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  return { title: t("purchases") };
}

const NewPurchasePage = async () => {
  const t = await getTranslations("Administre.purchase");
  const tCrud = await getTranslations("Crud");
  return (
    <section className='flex w-full flex-col gap-6'>
      <PageHeader title={t("createTitle")} description={t("createDescription")} icon={HiOutlineShoppingBag} eyebrow={tCrud("domains.sales")} />
      <PurchaseForm />
    </section>
  );
};

export default NewPurchasePage;
