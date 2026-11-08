/** @format */

import type { Metadata } from "next";
import { notFound, redirect, unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { HiOutlineTag } from "react-icons/hi2";
import { PageHeader } from "@/components/page-header";
import { marketplace_repository } from "@/server/domains/marketplace/repository";
import { ServerApiError } from "@/server/lib/types";
import { OfferForm, OFFERS_HREF } from "@/modules/marketplace";

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  return { title: t("offers") };
}

const EditOfferPage = async ({ params }: { params: Params }) => {
  const { locale, id } = await params;
  const offerId = Number(id);
  if (!Number.isInteger(offerId) || offerId <= 0) notFound();
  const t = await getTranslations("Administre.marketplace.offer");
  const tCrud = await getTranslations("Crud");
  let offer;
  try {
    offer = await marketplace_repository.get_offer(offerId);
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ServerApiError && error.status === 404) notFound();
    throw error;
  }
  // En revisión o cerrada no se edita (draco lo rechaza igual).
  if (offer.editable_fields.length === 0) redirect(`/${locale}${OFFERS_HREF}/${offer.id}`);
  return (
    <section className='flex w-full flex-col gap-6'>
      <PageHeader title={t("editTitle")} description={[offer.sku.name, offer.seller_name].filter(Boolean).join(" · ")} icon={HiOutlineTag} eyebrow={tCrud("domains.marketplace")} />
      <OfferForm offer={offer} />
    </section>
  );
};

export default EditOfferPage;
