/** @format */

"use client";

import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormTextAreaField } from "@repo/ui/form/scenes/form-area";
import { FormSelectField } from "@repo/ui/form/scenes/form-select";
import type { IFormProps } from "@repo/ui/form/models/form.interface";
import {
  HiOutlineAdjustmentsHorizontal,
  HiOutlineCursorArrowRays,
  HiOutlineSparkles,
  HiOutlineUserCircle,
} from "react-icons/hi2";
import { ProductLookupField } from "@/components/async-combobox";
import { FormSection, ModalFormFooter, SwitchField } from "@/components/form-sections";
import type { IRecommendationProduct } from "../models/recommendation.interface";
import { RECOMMENDATION_CONTEXTS, RECOMMENDATION_TYPES } from "../constants";

const toNumber = (value: unknown) => {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};

const isOneOf = <T extends string>(list: readonly T[], value: unknown): value is T =>
  typeof value === "string" && (list as readonly string[]).includes(value);

/**
 * Alta y edición de recomendaciones, en secciones: a quién y qué se recomienda, dónde y con qué prioridad, y el
 * embudo (clic y compra). Resume en vivo dónde aparecerá. Los botones quedan fijos al pie del modal.
 */
export const FormRecommendation = ({
  initialValues,
  validationSchema,
  onSubmit,
  mode = "create",
  onCancel,
  lockIdentity = false,
  initialProduct = null,
  onPickProduct,
}: IFormProps<any> & {
  mode?: "create" | "edit";
  onCancel?: () => void;
  lockIdentity?: boolean;
  /** Producto ya guardado (para mostrar su nombre sin buscarlo). */
  initialProduct?: IRecommendationProduct | null;
  onPickProduct?: (product: IRecommendationProduct | null) => void;
}) => {
  const t = useTranslations("Administre.recommendation");
  const tForm = useTranslations("Administre.recommendation.form");
  const tCommon = useTranslations("Administre.common");
  type RecommendationInputs = z.infer<typeof validationSchema>;

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = useForm<RecommendationInputs>({
    resolver: zodResolver(validationSchema),
    defaultValues: initialValues,
    mode: "onTouched",
  });

  // Solo se observan los campos que alimentan el resumen.
  const [typeValue, contextValue, scoreValue, positionValue] = useWatch({
    control,
    name: ["recommendation_type", "context", "score", "position"] as never,
  });
  const score = toNumber(scoreValue);
  const position = toNumber(positionValue);
  const canPreview =
    isOneOf(RECOMMENDATION_TYPES, typeValue) &&
    isOneOf(RECOMMENDATION_CONTEXTS, contextValue) &&
    score >= 0 &&
    score <= 1 &&
    Number.isInteger(position) &&
    position >= 1;

  const typeOptions = RECOMMENDATION_TYPES.map((value) => ({ id: value, value, label: t(`types.${value}`) }));
  const contextOptions = RECOMMENDATION_CONTEXTS.map((value) => ({
    id: value,
    value,
    label: t(`contexts.${value}`),
  }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className='flex flex-col gap-4 pb-1'>
      <FormSection
        icon={HiOutlineUserCircle}
        title={tForm("identity.title")}
        hint={lockIdentity ? t("identityLocked") : tForm("identity.hint")}>
        <FormField
          controller={{ control, name: "customer_id" }}
          type='number'
          inputMode='numeric'
          step='1'
          min={1}
          required
          autoFocus={!lockIdentity}
          disabled={lockIdentity}
          placeholder={tForm("placeholders.customerId")}
          label={t("fields.customerId")}
          classNameInput='tabular-nums'
          className='col-span-12 md:col-span-4'
        />
        <ProductLookupField
          control={control}
          name='product_id'
          label={t("fields.productId")}
          required
          placeholder={tCommon("selectPlaceholder")}
          disabled={lockIdentity}
          clearable={false}
          initialOption={
            initialProduct?.id != null
              ? { value: String(initialProduct.id), label: initialProduct.name ?? `#${initialProduct.id}` }
              : null
          }
          onSelect={(option) =>
            onPickProduct?.(
              option?.data
                ? { id: option.data.id, name: option.data.name, unit_price: option.data.unit_price, image_url: option.data.image_url }
                : null,
            )
          }
          className='col-span-12 md:col-span-8'
        />
      </FormSection>

      <FormSection icon={HiOutlineAdjustmentsHorizontal} title={tForm("placement.title")} hint={tForm("placement.hint")}>
        <FormSelectField
          controller={{ control, name: "recommendation_type" }}
          label={t("fields.recommendationType")}
          data={typeOptions}
          triggerClassName='!w-full'
          className='col-span-12 md:col-span-6'
        />
        <FormSelectField
          controller={{ control, name: "context" }}
          label={t("fields.context")}
          data={contextOptions}
          triggerClassName='!w-full'
          className='col-span-12 md:col-span-6'
        />
        <FormField
          controller={{ control, name: "score" }}
          type='number'
          inputMode='decimal'
          step='0.01'
          min={0}
          max={1}
          required
          autoFocus={lockIdentity}
          placeholder='0.50'
          label={t("fields.score")}
          classNameInput='tabular-nums'
          className='col-span-12 sm:col-span-6'
        />
        <FormField
          controller={{ control, name: "position" }}
          type='number'
          inputMode='numeric'
          step='1'
          min={1}
          required
          placeholder='1'
          label={t("fields.position")}
          classNameInput='tabular-nums'
          className='col-span-12 sm:col-span-6'
        />
        <p className='col-span-12 -mt-2 text-xs text-muted-foreground'>{tForm("hints.scorePosition")}</p>
        <FormTextAreaField
          controller={{ control, name: "reason" }}
          label={`${t("fields.reason")} (${tForm("optionalLower")})`}
          placeholder={tForm("placeholders.reason")}
          rows={2}
          className='col-span-12'
        />

        <div
          className='col-span-12 flex items-start gap-3 rounded-lg border border-dashed border-border bg-muted/40 p-3 text-sm'
          aria-live='polite'>
          <HiOutlineSparkles className='mt-0.5 h-4 w-4 shrink-0 text-primary' aria-hidden='true' />
          <p className='min-w-0 text-foreground'>
            {canPreview
              ? tForm("preview.example", {
                  type: t(`types.${typeValue as (typeof RECOMMENDATION_TYPES)[number]}`),
                  context: t(`contexts.${contextValue as (typeof RECOMMENDATION_CONTEXTS)[number]}`),
                  position,
                  score: score.toFixed(2),
                })
              : tForm("preview.empty")}
          </p>
        </div>
      </FormSection>

      <FormSection
        icon={HiOutlineCursorArrowRays}
        title={tForm("funnel.title")}
        hint={tForm("funnel.hint")}
        badge={tForm("optional")}>
        <div className='col-span-12 md:col-span-6'>
          <SwitchField
            control={control}
            name={"is_clicked" as never}
            id='recommendation-is-clicked'
            label={tForm("clicked.label")}
            description={tForm("clicked.description")}
          />
        </div>
        <div className='col-span-12 md:col-span-6'>
          <SwitchField
            control={control}
            name={"is_purchased" as never}
            id='recommendation-is-purchased'
            label={tForm("purchased.label")}
            description={tForm("purchased.description")}
          />
        </div>
      </FormSection>

      <ModalFormFooter
        note={tForm("requiredHint")}
        cancelLabel={tCommon("cancel")}
        onCancel={onCancel}
        submitting={isSubmitting}
        submitDisabled={mode === "edit" && !isDirty}
        submitLabel={mode === "edit" ? tForm("submitEdit") : tForm("submitCreate")}
      />
    </form>
  );
};
