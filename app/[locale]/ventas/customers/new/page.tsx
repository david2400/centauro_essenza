/** @format */

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HiOutlineUserPlus } from "react-icons/hi2";
import { PageHeader } from "@/components/page-header";
import { CustomerForm } from "@/modules/ventas/customer";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  return { title: t("customers") };
}

const NewCustomerPage = async () => {
  const t = await getTranslations("Administre.customer");
  const tCrud = await getTranslations("Crud");
  return (
    <section className='flex w-full flex-col gap-6'>
      <PageHeader title={t("createTitle")} description={t("createDescription")} icon={HiOutlineUserPlus} eyebrow={tCrud("domains.sales")} />
      <CustomerForm />
    </section>
  );
};

export default NewCustomerPage;
