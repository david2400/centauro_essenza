/** @format */

"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { notify } from "@/components/notifications";
import type { IFormAddProps } from "@repo/ui/form/models/form.interface";
import { FormRecommendation } from "../scenes/formRecommendation";
import {
  validationRecommendation,
  type RecommendationFormValues,
} from "../schemas/recommendation.schema";
import type { IRecommendation, IRecommendationProduct } from "../models/recommendation.interface";
import {
  createRecommendationServerAction,
  updateRecommendationServerAction,
} from "@/app/[locale]/contenido/recommendations/actions";

type Result = { success: true } | { success: false; error: string };

const toFormValues = (item?: IRecommendation | null) => ({
  customer_id: item?.customer_id ?? "",
  product_id: item?.product_id != null ? String(item.product_id) : "",
  recommendation_type: item?.recommendation_type ?? "CROSS_SELL",
  context: item?.context ?? "PRODUCT_PAGE",
  score: item?.score ?? 0.5,
  position: item?.position ?? 1,
  reason: item?.reason ?? "",
  is_clicked: String(Boolean(item?.is_clicked)),
  is_purchased: String(Boolean(item?.is_purchased)),
});

/**
 * Formulario de creación/edición. Al guardar se copian nombre, precio e
 * imagen del producto elegido (el backend los guarda desnormalizados).
 */
export const RecommendationForm = ({
  item,
  handleClose,
}: IFormAddProps & { item?: IRecommendation | null }) => {
  const router = useRouter();
  const t = useTranslations("Administre.common");
  const validationSchema = validationRecommendation();
  const id = item?.id;
  // Producto elegido en el buscador (sus datos se copian en la recomendación).
  const picked = useRef<IRecommendationProduct | null>(null);

  const done = (result: Result, title: string) => {
    if (result.success) {
      notify.success(title);
      handleClose?.(true);
      router.refresh();
    } else {
      notify.error(t("errorTitle"), result.error || t("unexpectedError"));
    }
  };

  const handleSubmit = async (values: RecommendationFormValues) => {
    const product = picked.current?.id === values.product_id ? picked.current : null;
    const payload = {
      ...values,
      reason: values.reason?.trim() ?? "",
      product_name: product?.name ?? item?.product_name,
      product_price: product?.unit_price ?? item?.product_price,
      product_image_url: product?.image_url ?? item?.product_image_url,
    };
    if (id != null) {
      done(await updateRecommendationServerAction({ ...payload, id }), t("updatedSuccess"));
    } else {
      done(await createRecommendationServerAction(payload), t("createdSuccess"));
    }
  };

  return (
    <FormRecommendation
      initialValues={toFormValues(item)}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      mode={id != null ? "edit" : "create"}
      onCancel={() => handleClose?.(false)}
      lockIdentity={id != null}
      initialProduct={item?.product_id != null ? { id: item.product_id, name: item.product_name } : null}
      onPickProduct={(product) => {
        picked.current = product;
      }}
    />
  );
};
