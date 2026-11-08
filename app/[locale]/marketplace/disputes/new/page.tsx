/** @format */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { get_order_by_id } from "@/server/domains/sales/orders/queries";
import { ServerApiError } from "@/server/lib/types";
import { DisputeOpenForm } from "@/modules/marketplace";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  return { title: t("disputes") };
}

const NewDisputePage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const orderId = Number((await searchParams).orderId);
  if (!Number.isInteger(orderId) || orderId <= 0) notFound();
  const order = await get_order_by_id({ id: orderId }).catch((error: unknown) => {
    if (error instanceof ServerApiError && error.is_not_found) notFound();
    throw error;
  });
  const [t, tCrud] = await Promise.all([getTranslations("Administre.marketplace.dispute"), getTranslations("Crud")]);
  return (
    <section className='flex w-full flex-col gap-6'>
      <PageHeader title={t("createTitle")} description={t("createDescription")} eyebrow={tCrud("domains.marketplace")} />
      <DisputeOpenForm order={{ id: orderId, number: order.order_number ?? null, sellerName: null,
        customerName: order.customer_name ?? null, total: Number(order.total ?? 0) }} />
    </section>
  );
};

export default NewDisputePage;
