/** @format */

import { unstable_rethrow } from 'next/navigation';
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { list_cash_registers } from "@/server/domains/sales/cash/queries";
import { list_payment_methods } from "@/server/domains/sales/payment-methods/queries";
import { get_billing_settings } from "@/server/domains/billing/settings/queries";
import { PosScreen } from "@/modules/ventas/cash";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  const tModule = await getTranslations({ locale, namespace: "Administre.cash.pos" });
  return { title: t("pos"), description: tModule("description") };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PosPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const params = await searchParams;
  const raw = Array.isArray(params.session) ? params.session[0] : params.session;
  const session = Number(raw);
  const [registers, methods, settings] = await Promise.all([
    list_cash_registers(false),
    list_payment_methods(false).catch((error) => { unstable_rethrow(error); return []; }),
    get_billing_settings().catch((error) => { unstable_rethrow(error); return null; }),
  ]);
  return (
    <PosScreen
      registers={registers}
      methods={methods}
      initialSessionId={Number.isInteger(session) && session > 0 ? session : null}
      billingReady={Boolean(settings?.ready)}
    />
  );
};

export default PosPage;
