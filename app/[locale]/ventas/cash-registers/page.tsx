/** @format */

import { unstable_rethrow } from 'next/navigation';
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { list_cash_registers, search_cash_sessions } from "@/server/domains/sales/cash/queries";
import { CashRegisterManager } from "@/modules/ventas/cash";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  const tModule = await getTranslations({ locale, namespace: "Administre.cash.register" });
  return { title: t("cashRegister"), description: tModule("description") };
}

const CashRegistersPage = async () => {
  const [registers, sessions] = await Promise.all([
    list_cash_registers(true),
    search_cash_sessions({ q: "", page: 0, size: 20, sort: { field: "id", direction: "desc" }, filters: {} }).catch((error) => { unstable_rethrow(error); return null; }),
  ]);
  return <CashRegisterManager registers={registers} sessions={sessions?.items ?? []} />;
};

export default CashRegistersPage;
