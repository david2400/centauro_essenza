/** @format */

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { operations_repository } from "@/server/domains/operations/repository";
import { OperationsCenter } from "@/modules/operations";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  return { title: t("operations") };
}

const OperationsPage = async () => {
  const data = await operations_repository.alerts();
  return <OperationsCenter data={data} />;
};

export default OperationsPage;
