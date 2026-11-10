/** @format */

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { seller_invoices_repository } from "@/server/domains/marketplace/seller-invoices/repository";
import { get_marketplace_access } from "@/server/domains/marketplace/access";
import { SellerInvoices } from "@/modules/marketplace";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  return { title: t("sellerInvoices") };
}

/** Mes anterior al actual (el último cerrado) en formato AAAA-MM. */
const lastClosedMonth = () => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const SellerInvoicesPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const raw = (await searchParams).period;
  const period = typeof raw === "string" && /^\d{4}-\d{2}$/.test(raw) ? raw : lastClosedMonth();
  const [preview, access] = await Promise.all([seller_invoices_repository.preview(period), get_marketplace_access()]);
  return <SellerInvoices key={period} preview={preview} canManage={access.billingManage} />;
};

export default SellerInvoicesPage;
