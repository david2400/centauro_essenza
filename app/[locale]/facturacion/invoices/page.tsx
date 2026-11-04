/** @format */

import { unstable_rethrow } from 'next/navigation';
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { search_invoices, summarize_invoices } from "@/server/domains/billing/invoices/queries";
import { get_billing_settings } from "@/server/domains/billing/settings/queries";
import { parse_grid_query } from "@/server/lib/pagination";
import { INVOICE_GRID } from "./grid";
import { InvoiceManager } from "@/modules/facturacion/invoice";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  const tModule = await getTranslations({ locale, namespace: "Administre.billing.invoice.list" });
  return { title: t("invoice"), description: tModule("description") };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const InvoicesPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const query = parse_grid_query(await searchParams, INVOICE_GRID);
  const [page, summary, settings] = await Promise.all([
    search_invoices(query),
    summarize_invoices(query).catch((error) => { unstable_rethrow(error); return null; }),
    get_billing_settings().catch((error) => { unstable_rethrow(error); return null; }),
  ]);
  return <InvoiceManager page={page} summary={summary} settings={settings} />;
};

export default InvoicesPage;
