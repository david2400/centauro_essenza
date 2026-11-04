/** @format */

import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { get_invoice } from "@/server/domains/billing/invoices/queries";
import { get_billing_settings } from "@/server/domains/billing/settings/queries";
import { ServerApiError } from "@/server/lib/types";
import { InvoiceDetail } from "@/modules/facturacion/invoice";

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "Administre.billing.invoice" });
  return { title: t("metaTitle", { id }) };
}

const InvoiceDetailPage = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const invoiceId = Number(id);
  if (!Number.isInteger(invoiceId) || invoiceId <= 0) notFound();
  const [invoice, settings] = await Promise.all([
    get_invoice({ id: invoiceId }).catch((error: unknown) => {
      if (error instanceof ServerApiError && error.is_not_found) notFound();
      throw error;
    }),
    get_billing_settings().catch((error) => { unstable_rethrow(error); return null; }),
  ]);
  return <InvoiceDetail invoice={invoice} issuer={settings} />;
};

export default InvoiceDetailPage;
