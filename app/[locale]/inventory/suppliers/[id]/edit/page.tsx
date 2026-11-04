/** @format */

import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { get_supplier_by_id } from "@/server/domains/inventory/suppliers/queries";
import { ServerApiError } from "@/server/lib/types";
import { SupplierEditor } from "@/modules/inventory/supplier";

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Administre.supplier" });
  return { title: t("editTitle") };
}

const EditSupplierPage = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const supplierId = Number(id);
  if (!Number.isInteger(supplierId) || supplierId <= 0) notFound();
  try {
    return <SupplierEditor supplier={await get_supplier_by_id({ id: supplierId })} />;
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ServerApiError && error.status === 404) notFound();
    throw error;
  }
};

export default EditSupplierPage;
