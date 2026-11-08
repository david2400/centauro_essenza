/** @format */

import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { purchase_orders_repository } from "@/server/domains/inventory/purchase-orders/repository";
import { ServerApiError } from "@/server/lib/types";
import { PurchaseOrderForm } from "@/modules/inventory/purchase-order";

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  return { title: t("purchaseOrders") };
}

const EditPurchaseOrderPage = async ({ params }: { params: Params }) => {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  try {
    const [order, options, t, tCrud] = await Promise.all([purchase_orders_repository.get(id), purchase_orders_repository.options(),
      getTranslations("Administre.purchaseOrder"), getTranslations("Crud")]);
    return (
      <section className='flex w-full flex-col gap-6'>
        <PageHeader title={t("editTitle", { number: order.summary.number ?? `#${id}` })} eyebrow={tCrud("domains.inventory")} />
        <PurchaseOrderForm order={order} options={options} />
      </section>
    );
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ServerApiError && error.status === 404) notFound();
    throw error;
  }
};

export default EditPurchaseOrderPage;
