/** @format */

import { unstable_rethrow } from 'next/navigation';
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { search_payments, summarize_payments } from "@/server/domains/sales/payments/queries";
import { list_payment_methods } from "@/server/domains/sales/payment-methods/queries";
import { parse_grid_query } from "@/server/lib/pagination";
import { PAYMENT_GRID } from "./grid";
import { PaymentManager } from "@/modules/ventas/payment";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  const tModule = await getTranslations({ locale, namespace: "Administre.payment.list" });

  return { title: t("payment"), description: tModule("description") };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PaymentsPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const query = parse_grid_query(await searchParams, PAYMENT_GRID);
  // El resumen usa los mismos filtros que la tabla; si falla, la tabla se muestra igual.
  const [page, summary, methods] = await Promise.all([
    search_payments(query),
    summarize_payments(query).catch((error) => { unstable_rethrow(error); return null; }),
    list_payment_methods(true).catch((error) => { unstable_rethrow(error); return []; }),
  ]);

  return <PaymentManager page={page} summary={summary} methods={methods} />;
};

export default PaymentsPage;
