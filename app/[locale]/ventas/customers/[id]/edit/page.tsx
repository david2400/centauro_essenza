/** @format */

import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { HiOutlineUserCircle } from "react-icons/hi2";
import { PageHeader } from "@/components/page-header";
import { customers_repository } from "@/server/domains/sales/customers/repository";
import { ServerApiError } from "@/server/lib/types";
import { CustomerForm } from "@/modules/ventas/customer";

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  return { title: t("customers") };
}

const EditCustomerPage = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const customerId = Number(id);
  if (!Number.isInteger(customerId) || customerId <= 0) notFound();
  const t = await getTranslations("Administre.customer");
  const tCrud = await getTranslations("Crud");
  let customer;
  try {
    customer = await customers_repository.get(customerId);
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ServerApiError && error.status === 404) notFound();
    throw error;
  }
  return (
    <section className='flex w-full flex-col gap-6'>
      <PageHeader title={t("editTitle")} description={`${customer.doc_type} ${customer.doc_number}`} icon={HiOutlineUserCircle}
        eyebrow={tCrud("domains.sales")} />
      <CustomerForm customer={customer} />
    </section>
  );
};

export default EditCustomerPage;
