/** @format */

import type { Metadata } from "next";
import { notFound, redirect, unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { HiOutlineReceiptPercent } from "react-icons/hi2";
import { PageHeader } from "@/components/page-header";
import { marketplace_repository } from "@/server/domains/marketplace/repository";
import { ServerApiError } from "@/server/lib/types";
import { PlanForm, PLANS_HREF } from "@/modules/marketplace";

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  return { title: t("plans") };
}

const EditPlanPage = async ({ params }: { params: Params }) => {
  const { locale, id } = await params;
  const planId = Number(id);
  if (!Number.isInteger(planId) || planId <= 0) notFound();
  const t = await getTranslations("Administre.marketplace.plan");
  const tCrud = await getTranslations("Crud");
  let plan;
  try {
    plan = await marketplace_repository.get_plan(planId);
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ServerApiError && error.status === 404) notFound();
    throw error;
  }
  // Solo los borradores se editan; una versión publicada es inmutable.
  if (plan.status !== "DRAFT") redirect(`/${locale}${PLANS_HREF}/${plan.id}`);
  return (
    <section className='flex w-full flex-col gap-6'>
      <PageHeader title={t("editTitle")} description={`${plan.code} · v${plan.version}`} icon={HiOutlineReceiptPercent} eyebrow={tCrud("domains.marketplace")} />
      <PlanForm plan={plan} />
    </section>
  );
};

export default EditPlanPage;
