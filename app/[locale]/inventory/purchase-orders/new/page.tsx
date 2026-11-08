/** @format */

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { purchase_orders_repository } from "@/server/domains/inventory/purchase-orders/repository";
import { PurchaseOrderForm } from "@/modules/inventory/purchase-order";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  return { title: t("purchaseOrders") };
}

const NewPurchaseOrderPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const supplierId = Number((await searchParams).supplierId);
  const [options, t, tCrud] = await Promise.all([purchase_orders_repository.options(), getTranslations("Administre.purchaseOrder"),
    getTranslations("Crud")]);
  return (
    <section className='flex w-full flex-col gap-6'>
      <PageHeader title={t("createTitle")} description={t("createDescription")} eyebrow={tCrud("domains.inventory")} />
      <PurchaseOrderForm options={options} supplierId={Number.isInteger(supplierId) && supplierId > 0 ? supplierId : null} />
    </section>
  );
};

export default NewPurchaseOrderPage;
