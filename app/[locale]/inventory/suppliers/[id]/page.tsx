/** @format */

import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { get_supplier_by_id, list_supplier_products } from "@/server/domains/inventory/suppliers/queries";
import { ServerApiError } from "@/server/lib/types";
import { SupplierDetailScene } from "@/modules/inventory/supplier";

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  return { title: t("supplier") };
}

const SupplierDetailPage = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const supplierId = Number(id);
  if (!Number.isInteger(supplierId) || supplierId <= 0) notFound();
  try {
    const [supplier, products] = await Promise.all([
      get_supplier_by_id({ id: supplierId }),
      list_supplier_products({ id: supplierId }),
    ]);
    return <SupplierDetailScene supplier={supplier} products={products} />;
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ServerApiError && error.status === 404) notFound();
    throw error;
  }
};

export default SupplierDetailPage;
