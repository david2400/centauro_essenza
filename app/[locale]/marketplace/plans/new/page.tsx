/** @format */

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HiOutlineReceiptPercent } from "react-icons/hi2";
import { PageHeader } from "@/components/page-header";
import { PlanForm } from "@/modules/marketplace";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  return { title: t("plans") };
}

const NewPlanPage = async () => {
  const t = await getTranslations("Administre.marketplace.plan");
  const tCrud = await getTranslations("Crud");
  return (
    <section className='flex w-full flex-col gap-6'>
      <PageHeader title={t("createTitle")} description={t("createDescription")} icon={HiOutlineReceiptPercent} eyebrow={tCrud("domains.marketplace")} />
      <PlanForm />
    </section>
  );
};

export default NewPlanPage;
