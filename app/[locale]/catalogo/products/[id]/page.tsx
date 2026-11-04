/** @format */

import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { get_product_by_id, list_product_images } from "@/server/domains/inventory/products/queries";
import { list_variants_of_product } from "@/server/domains/inventory/product-children/queries";
import { list_items_of_combo } from "@/server/domains/inventory/product-combos/queries";
import { list_stock_levels, list_stock_reservations } from "@/server/domains/inventory/stock/queries";
import { list_all_warehouses } from "@/server/domains/inventory/warehouses/queries";
import { list_attributes } from "@/server/domains/catalog/attributes/queries";
import { get_variant_matrix } from "@/server/domains/catalog/variant-matrix/queries";
import { list_product_templates } from "@/server/domains/catalog/product-templates/queries";
import { lookup_products } from "@/server/domains/lookups/queries";
import { list_units } from "@/server/domains/product_details/unit-measurements/queries";
import { list_tax_rates } from "@/server/domains/billing/tax-rates/queries";
import { ServerApiError } from "@/server/lib/types";
import { ProductEditor } from "@/modules/catalogo/products";

type Params = Promise<{ locale: string; id: string }>;

const parseId = (value: string) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "Administre.productEditor" });
  return { title: t("metaTitle", { id }) };
}

const ProductEditorPage = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const productId = parseId(id);
  if (productId == null) notFound();

  const product = await get_product_by_id({ id: productId }).catch((error: unknown) => {
    if (error instanceof ServerApiError && error.is_not_found) notFound();
    throw error;
  });

  const [variants, images, levels, reservations, warehouses, templates, attributes, comboItems, units, taxRates, variantMatrix] = await Promise.all([
    list_variants_of_product({ product_id: productId }),
    list_product_images({ id: productId }),
    list_stock_levels({ product_id: productId }),
    list_stock_reservations({ product_id: productId, status: "ACTIVE", limit: 50 }),
    list_all_warehouses(),
    list_product_templates(),
    list_attributes(),
    product.is_combo ? list_items_of_combo({ combo_id: productId }) : Promise.resolve([]),
    list_units(),
    list_tax_rates(false).catch((error) => { unstable_rethrow(error); return []; }),
    // El asistente es opcional: si la matriz falla, la pestaña sigue con el listado clásico.
    product.is_combo ? Promise.resolve(null) : get_variant_matrix(productId).catch((error) => { unstable_rethrow(error); return null; }),
  ]);

  // Nombres de los componentes del combo (solo esos ids, no el catálogo entero).
  const componentIds = [...new Set(comboItems.map((item) => item.product_id).filter((value): value is number => value != null))];
  const components = componentIds.length > 0 ? await lookup_products({ ids: componentIds }) : [];
  const componentNames = new Map(components.map((item) => [item.id, item.name]));

  return (
    <ProductEditor
      product={product}
      variants={variants}
      images={images}
      levels={levels}
      reservations={reservations}
      warehouses={warehouses.map(({ id: warehouseId, name, code }) => ({ id: warehouseId, name: code ? `${code} · ${name}` : name }))}
      templates={templates}
      attributes={attributes}
      comboItems={comboItems.map((item) => ({ ...item, product_name: componentNames.get(item.product_id) }))}
      units={units}
      taxRates={taxRates}
      variantMatrix={variantMatrix}
    />
  );
};

export default ProductEditorPage;
