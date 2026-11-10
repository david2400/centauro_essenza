/** @format */

import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { purchases_repository } from "@/server/domains/sales/purchases/repository";
import { get_purchase_access } from "@/server/domains/sales/purchases/access";
import { list_payment_methods } from "@/server/domains/sales/payment-methods/queries";
import { ServerApiError } from "@/server/lib/types";
import { PurchaseCheckout, PurchaseDetail } from "@/modules/ventas/purchase";

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  return { title: t("purchases") };
}

const PurchaseDetailPage = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const purchaseId = Number(id);
  if (!Number.isInteger(purchaseId) || purchaseId <= 0) notFound();
  try {
    const [purchase, access, methods] = await Promise.all([
      purchases_repository.get(purchaseId),
      get_purchase_access(),
      list_payment_methods(false, "VIRTUAL").catch((error) => { unstable_rethrow(error); return []; }),
    ]);
    // Presentación: draco valida el permiso y el saldo al generar el link.
    const canCollect = access.manage && purchase.pending_total > 0 && purchase.status !== "CANCELLED";
    return (
      <PurchaseDetail purchase={purchase} checkout={canCollect ? (
        <PurchaseCheckout purchaseId={purchase.id} methods={methods} defaultEmail={purchase.customer_email} pendingTotal={purchase.pending_total} />
      ) : undefined} />
    );
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ServerApiError && error.status === 404) notFound();
    throw error;
  }
};

export default PurchaseDetailPage;
