/** @format */

"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormTextAreaField } from "@repo/ui/form/scenes/form-area";
import { FormSelectField } from "@repo/ui/form/scenes/form-select";
import type { IFormProps } from "@repo/ui/form/models/form.interface";
import { HiOutlineAdjustmentsHorizontal, HiOutlineCodeBracket, HiOutlineUserCircle } from "react-icons/hi2";
import { FormSection, ModalFormFooter } from "@/components/form-sections";
import { fieldKey } from "@/shared/i18n/field-key";
import { JSON_FIELDS, SEGMENTS } from "../constants";

/**
 * Alta y edición de perfiles de personalización, en secciones: cliente, segmentación y datos JSON (opcionales,
 * plegados salvo que tengan errores). Los botones quedan fijos al pie del modal.
 */
export const FormPersonalizationProfile = ({
  initialValues,
  validationSchema,
  onSubmit,
  mode = "create",
  onCancel,
}: IFormProps<any> & { mode?: "create" | "edit"; onCancel?: () => void }) => {
  const t = useTranslations("Administre.personalization");
  const tForm = useTranslations("Administre.personalization.form");
  const tCommon = useTranslations("Administre.common");
  type ProfileInputs = z.infer<typeof validationSchema>;

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, isDirty, errors },
  } = useForm<ProfileInputs>({
    resolver: zodResolver(validationSchema),
    defaultValues: initialValues,
    mode: "onTouched",
  });

  const segmentOptions = SEGMENTS.map((value) => ({ id: value, value, label: t(`segments.${value}`) }));
  // Abre la sección avanzada si alguno de sus campos tiene error.
  const advancedHasError = JSON_FIELDS.some((field) => field in (errors as Record<string, unknown>));

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className='flex flex-col gap-4 pb-1'>
      <FormSection icon={HiOutlineUserCircle} title={tForm("customer.title")} hint={tForm("customer.hint")}>
        <FormField
          controller={{ control, name: "customer_id" }}
          label={t("fields.customerId")}
          required
          autoFocus
          type='number'
          inputMode='numeric'
          step='1'
          min={1}
          placeholder={tForm("placeholders.customerId")}
          classNameInput='tabular-nums'
          className='col-span-12 sm:col-span-5'
        />
        <FormField
          controller={{ control, name: "session_id" }}
          label={t("fields.sessionId")}
          autoComplete='off'
          spellCheck={false}
          maxLength={100}
          placeholder={tForm("placeholders.sessionId")}
          classNameInput='font-mono'
          className='col-span-12 sm:col-span-7'
        />
      </FormSection>

      <FormSection
        icon={HiOutlineAdjustmentsHorizontal}
        title={tForm("segmentation.title")}
        hint={tForm("segmentation.hint")}>
        <FormSelectField
          controller={{ control, name: "segment" }}
          label={t("fields.segment")}
          required
          data={segmentOptions}
          triggerClassName='!w-full'
          className='col-span-12 sm:col-span-6 md:col-span-4'
        />
        <FormField
          controller={{ control, name: "personalization_score" }}
          label={t("fields.personalizationScore")}
          type='number'
          inputMode='decimal'
          step='0.01'
          min={0}
          max={1}
          placeholder='0.75'
          classNameInput='tabular-nums'
          className='col-span-12 sm:col-span-6 md:col-span-4'
        />
        <FormField
          controller={{ control, name: "status" }}
          label={t("fields.status")}
          maxLength={50}
          placeholder={tForm("placeholders.status")}
          className='col-span-12 md:col-span-4'
        />
        <p className='col-span-12 -mt-2 text-xs text-muted-foreground'>{tForm("hints.score")}</p>
      </FormSection>

      <FormSection icon={HiOutlineCodeBracket} title={t("advanced")} hint={t("advancedHint")} badge={tForm("optional")}>
        <details open={advancedHasError || undefined} className='group col-span-12'>
          <summary className='cursor-pointer text-sm font-medium text-primary underline-offset-4 hover:underline'>
            {tForm("advancedToggle")}
          </summary>
          <div className='mt-4 grid grid-cols-12 gap-4'>
            {JSON_FIELDS.map((field) => (
              <FormTextAreaField
                key={field}
                controller={{ control, name: field }}
                label={t(fieldKey(field) as never)}
                rows={4}
                spellCheck={false}
                placeholder='{ }'
                classNameInput='font-mono text-xs'
                className='col-span-12 md:col-span-6'
              />
            ))}
          </div>
        </details>
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
