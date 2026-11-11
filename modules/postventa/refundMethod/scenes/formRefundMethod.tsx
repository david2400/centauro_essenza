/** @format */

"use client";

import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormTextAreaField } from "@repo/ui/form/scenes/form-area";
import type { IFormProps } from "@repo/ui/form/models/form.interface";
import type { ISelectOption } from "@repo/ui/form/models";
import {
  HiOutlineArrowTopRightOnSquare,
  HiOutlineDocumentText,
  HiOutlineIdentification,
  HiOutlineSparkles,
} from "react-icons/hi2";
import { FormSection, ModalFormFooter, SwitchField } from "@/components/form-sections";
import { Link } from "@/shared/i18n/routing";

export type RefundMethodFormOptions = Partial<Record<string, ISelectOption[]>>;

/** Pantalla donde se elige el método de reembolso de cada devolución. */
const DEVOLUTIONS_HREF = "/postventa/devolutions";

const asText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/**
 * Alta y edición de métodos de reembolso, en secciones: identificación, política para el cliente y estado. Muestra en
 * vivo cómo quedará el método al registrar una devolución. Los botones quedan fijos al pie del modal.
 */
export const FormRefundMethod = ({
  initialValues,
  validationSchema,
  onSubmit,
  mode = "create",
  onCancel,
}: IFormProps<any> & { options?: RefundMethodFormOptions; mode?: "create" | "edit"; onCancel?: () => void }) => {
  const t = useTranslations("Administre.refundMethod");
  const tForm = useTranslations("Administre.refundMethod.form");
  const tCommon = useTranslations("Administre.common");
  type RefundMethodInputs = z.infer<typeof validationSchema>;

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = useForm<RefundMethodInputs>({
    resolver: zodResolver(validationSchema),
    defaultValues: initialValues,
    mode: "onTouched",
  });

  // Solo se observan los campos que alimentan el resumen.
  const [nameValue, policyValue] = useWatch({ control, name: ["name", "policy"] as never });
  const name = asText(nameValue);
  const policy = asText(policyValue);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className='flex flex-col gap-4 pb-1'>
      <FormSection icon={HiOutlineIdentification} title={tForm("identity.title")} hint={tForm("identity.hint")}>
        <FormField
          controller={{ control, name: "name" }}
          label={t("fields.name")}
          required
          autoFocus
          autoComplete='off'
          placeholder={tForm("placeholders.name")}
          maxLength={120}
          className='col-span-12'
        />
        <FormTextAreaField
          controller={{ control, name: "description" }}
          label={`${t("fields.description")} (${tForm("optionalLower")})`}
          placeholder={tForm("placeholders.description")}
          rows={2}
          className='col-span-12'
        />
      </FormSection>

      <FormSection
        icon={HiOutlineDocumentText}
        title={tForm("policy.title")}
        hint={tForm("policy.hint")}
        badge={tForm("optional")}>
        <FormTextAreaField
          controller={{ control, name: "policy" }}
          label={t("fields.policy")}
          placeholder={tForm("placeholders.policy")}
          rows={4}
          className='col-span-12'
        />

        <div
          className='col-span-12 flex items-start gap-3 rounded-lg border border-dashed border-border bg-muted/40 p-3 text-sm'
          aria-live='polite'>
          <HiOutlineSparkles className='mt-0.5 h-4 w-4 shrink-0 text-primary' aria-hidden='true' />
          <div className='min-w-0 space-y-1'>
            {name ? (
              <>
                <p className='text-xs text-muted-foreground'>{tForm("preview.title")}</p>
                <p className='font-semibold text-foreground'>{name}</p>
                <p className='line-clamp-3 whitespace-pre-line text-foreground'>
                  {policy || tForm("preview.noPolicy")}
                </p>
              </>
            ) : (
              <p className='text-foreground'>{tForm("preview.empty")}</p>
            )}
            <Link
              href={DEVOLUTIONS_HREF}
              target='_blank'
              className='inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline'>
              {tForm("preview.devolutionsLink")}
              <HiOutlineArrowTopRightOnSquare className='h-3.5 w-3.5' aria-hidden='true' />
              <span className='sr-only'>{tForm("preview.newTab")}</span>
            </Link>
          </div>
        </div>
      </FormSection>

      <SwitchField
        control={control}
        name={"active" as never}
        id='refund-method-active'
        label={tForm("active.label")}
        description={tForm("active.description")}
      />

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
