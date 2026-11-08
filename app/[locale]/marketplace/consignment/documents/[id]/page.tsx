/** @format */

import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { consignment_repository } from "@/server/domains/marketplace/consignment/repository";
import { ServerApiError } from "@/server/lib/types";
import { ConsignmentDocumentDetail } from "@/modules/marketplace";

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  return { title: t("consignment") };
}

const ConsignmentDocumentPage = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const documentId = Number(id);
  if (!Number.isInteger(documentId) || documentId <= 0) notFound();
  try {
    const document = await consignment_repository.document(documentId);
    return <ConsignmentDocumentDetail document={document} />;
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ServerApiError && error.status === 404) notFound();
    throw error;
  }
};

export default ConsignmentDocumentPage;
