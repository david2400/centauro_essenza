/** @format */

import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { HiOutlineTag } from "react-icons/hi2";
import { PageHeader } from "@/components/page-header";
import { marketplace_repository } from "@/server/domains/marketplace/repository";
import { OfferForm } from "@/modules/marketplace";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  return { title: t("offers") };
}

const NewOfferPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const t = await getTranslations("Administre.marketplace.offer");
  const tCrud = await getTranslations("Crud");
  const raw = (await searchParams).sellerId;
  const sellerId = Number(Array.isArray(raw) ? raw[0] : raw);
  // El vendedor de la URL es solo una preselección: draco valida empresa, tipo y estado al crear.
  const seller = Number.isInteger(sellerId) && sellerId > 0
    ? await marketplace_repository.get_seller(sellerId).catch((error) => { unstable_rethrow(error); return null; })
    : null;
  const preset = seller && seller.kind === "EXTERNAL" && seller.status !== "CLOSED" ? seller : null;
  return (
    <section className='flex w-full flex-col gap-6'>
      <PageHeader title={t("createTitle")} description={t("createDescription")} icon={HiOutlineTag} eyebrow={tCrud("domains.marketplace")} />
      <OfferForm sellerId={preset?.id ?? null} sellerName={preset ? (preset.trade_name ?? preset.legal_name) : null} />
    </section>
  );
};

export default NewOfferPage;
