/** @format */

import { unstable_rethrow } from 'next/navigation';
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProductCreate } from "@/modules/catalogo/products";
import { list_units } from "@/server/domains/product_details/unit-measurements/queries";
import { list_tax_rates } from "@/server/domains/billing/tax-rates/queries";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Administre.product" });
  return { title: t("createTitle") };
}

const NewProductPage = async () => {
  const [units, taxRates] = await Promise.all([list_units(), list_tax_rates(false).catch((error) => { unstable_rethrow(error); return []; })]);
  return <ProductCreate units={units} taxRates={taxRates} />;
};

export default NewProductPage;
