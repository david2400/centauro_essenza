/** @format */

import type { Metadata } from "next";
import { notFound, unstable_rethrow } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { get_attribute_by_id, get_attribute_usage } from "@/server/domains/catalog/attributes/queries";
import { list_units } from "@/server/domains/product_details/unit-measurements/queries";
import { ServerApiError } from "@/server/lib/types";
import { AttributeEditor } from "@/modules/fichaTecnica/attribute";

type Params = Promise<{ locale: string; id: string }>;

const parseId = (value: string) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const notFoundOr = (error: unknown): never => {
  if (error instanceof ServerApiError && error.is_not_found) notFound();
  throw error;
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "Administre.attribute.editor" });
  return { title: t("metaTitle", { id }) };
}

const AttributeEditorPage = async ({ params }: { params: Params }) => {
  const { id } = await params;
  const attributeId = parseId(id);
  if (attributeId == null) notFound();

  const [attribute, usage, units] = await Promise.all([
    get_attribute_by_id({ id: attributeId }).catch(notFoundOr),
    // El uso es informativo: si falla, el editor funciona igual (sin el panel).
    get_attribute_usage({ id: attributeId }).catch((error) => { unstable_rethrow(error); return null; }),
    list_units(),
  ]);

  return <AttributeEditor attribute={attribute} usage={usage} units={units} />;
};

export default AttributeEditorPage;
