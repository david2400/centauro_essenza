/** @format */

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { customers_repository } from "@/server/domains/sales/customers/repository";
import { get_purchase_access } from "@/server/domains/sales/purchases/access";
import { parse_grid_query } from "@/server/lib/pagination";
import { CustomerManager } from "@/modules/ventas/customer";
import { CUSTOMER_GRID } from "./grid";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Titles" });
  const tModule = await getTranslations({ locale, namespace: "Administre.customer" });
  return { title: t("customers"), description: tModule("description") };
}

const CustomersPage = async ({ searchParams }: { searchParams: SearchParams }) => {
  const query = parse_grid_query(await searchParams, CUSTOMER_GRID);
  const [page, access] = await Promise.all([customers_repository.search(query), get_purchase_access()]);
  return <CustomerManager page={page} canManage={access.manage} />;
};

export default CustomersPage;
