/** @format */

import { unstable_rethrow } from 'next/navigation';
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { list_stores } from "@/server/domains/sales/cash/queries";
import { list_all_warehouses } from "@/server/domains/inventory/warehouses/queries";
import { list_payment_methods } from "@/server/domains/sales/payment-methods/queries";
import { get_billing_settings } from "@/server/domains/billing/settings/queries";
import { CashRegisterEditor } from "@/modules/ventas/cash";
import { with_fallback } from '@/server/lib/fallback';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Administre.cash.register" });
  return { title: t("createTitle") };
}

const NewCashRegisterPage = async () => {
  const [stores, warehouses, methods, billing] = await Promise.all([
    list_stores(true),
    with_fallback(list_all_warehouses(), []),
    with_fallback(list_payment_methods(false), []),
    get_billing_settings().catch((error) => { unstable_rethrow(error); return null; }),
  ]);
  return (
    <CashRegisterEditor
      stores={stores}
      warehouses={warehouses.map(({ id, name }) => ({ id, name }))}
      methods={methods.map(({ id, name, kind, channel, active }) => ({ id, name, kind, channel, active }))}
      billingReady={Boolean(billing?.ready)}
    />
  );
};

export default NewCashRegisterPage;
