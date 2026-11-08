/** @format */

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { ConsignmentDocumentForm } from "@/modules/marketplace";
import { load_consignment_options } from "../options";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  return { title: t("consignment") };
}

const NewConsignmentDocumentPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const params = await searchParams;
  const kind = params.kind === "RETURN_TO_SELLER" ? "RETURN_TO_SELLER" : "RECEIPT";
  const sellerId = Number(params.sellerId);
  const [options, t, tCrud] = await Promise.all([
    load_consignment_options(),
    getTranslations("Administre.marketplace.consignment.form"),
    getTranslations("Crud"),
  ]);
  return (
    <section className='flex w-full flex-col gap-6'>
      <PageHeader title={kind === "RECEIPT" ? t("receiptTitle") : t("returnTitle")}
        description={kind === "RECEIPT" ? t("receiptHint") : t("returnHint")} eyebrow={tCrud("domains.marketplace")} />
      <ConsignmentDocumentForm kind={kind} options={options}
        sellerId={Number.isInteger(sellerId) && sellerId > 0 ? sellerId : null} />
    </section>
  );
};

export default NewConsignmentDocumentPage;
