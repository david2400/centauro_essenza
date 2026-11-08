/** @format */

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { consignment_repository } from "@/server/domains/marketplace/consignment/repository";
import { parse_grid_query } from "@/server/lib/pagination";
import { ConsignmentDocumentManager } from "@/modules/marketplace";
import { CONSIGNMENT_DOCUMENTS_GRID } from "../grid";
import { load_consignment_options } from "../options";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Administre.marketplace.consignment.documentsPage" });
  return { title: t("title"), description: t("description") };
}

const ConsignmentDocumentsPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const query = parse_grid_query(await searchParams, CONSIGNMENT_DOCUMENTS_GRID);
  const [page, options] = await Promise.all([consignment_repository.documents(query), load_consignment_options()]);
  return <ConsignmentDocumentManager page={page} options={options} />;
};

export default ConsignmentDocumentsPage;
