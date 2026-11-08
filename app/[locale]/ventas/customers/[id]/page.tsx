/** @format */

import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { customers_repository } from "@/server/domains/sales/customers/repository";
import { get_purchase_access } from "@/server/domains/sales/purchases/access";
import { ServerApiError } from "@/server/lib/types";
import { CustomerDetail } from "@/modules/ventas/customer";
import { CustomerReturns } from "@/modules/postventa/devolution";
import { CustomerInvoices } from "@/modules/facturacion/invoice";

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  return { title: t("customers") };
}

const CustomerDetailPage = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const customerId = Number(id);
  if (!Number.isInteger(customerId) || customerId <= 0) notFound();
  try {
    const [customer, access] = await Promise.all([customers_repository.get(customerId), get_purchase_access()]);
    // La posventa llega solo si el usuario puede ver cada módulo (lo decide draco).
    const after = customer.after_sales;
    return (
      <CustomerDetail
        customer={customer}
        canManage={access.manage}
        returns={after?.returns ? <CustomerReturns data={after.returns} /> : undefined}
        invoices={after?.invoices ? <CustomerInvoices data={after.invoices} /> : undefined}
      />
    );
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ServerApiError && error.status === 404) notFound();
    throw error;
  }
};

export default CustomerDetailPage;
