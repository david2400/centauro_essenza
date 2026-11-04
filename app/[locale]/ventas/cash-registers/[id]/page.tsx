/** @format */

import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { list_cash_registers, list_stores } from "@/server/domains/sales/cash/queries";
import { list_all_warehouses } from "@/server/domains/inventory/warehouses/queries";
import { list_payment_methods } from "@/server/domains/sales/payment-methods/queries";
import { get_billing_settings } from "@/server/domains/billing/settings/queries";
import { CashRegisterEditor } from "@/modules/ventas/cash";

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  return { title: t("cashRegister") };
}

const EditCashRegisterPage = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const registerId = Number(id);
  const [registers, stores, warehouses, methods, billing] = await Promise.all([
    list_cash_registers(true),
    list_stores(true),
    list_all_warehouses().catch((error) => { unstable_rethrow(error); return []; }),
    list_payment_methods(false).catch((error) => { unstable_rethrow(error); return []; }),
    get_billing_settings().catch((error) => { unstable_rethrow(error); return null; }),
  ]);
  const register = registers.find((item) => item.id === registerId);
  if (!register) notFound();
  return (
    <CashRegisterEditor
      register={register}
      stores={stores}
      warehouses={warehouses.map(({ id: warehouseId, name }) => ({ id: warehouseId, name }))}
      methods={methods.map(({ id: methodId, name, kind, channel, active }) => ({ id: methodId, name, kind, channel, active }))}
      billingReady={Boolean(billing?.ready)}
    />
  );
};

export default EditCashRegisterPage;
