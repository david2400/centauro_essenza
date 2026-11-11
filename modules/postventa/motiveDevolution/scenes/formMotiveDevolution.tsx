/** @format */

"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormTextAreaField } from "@repo/ui/form/scenes/form-area";
import type { IFormProps } from "@repo/ui/form/models/form.interface";
import { HiOutlineChatBubbleLeftEllipsis } from "react-icons/hi2";
import { FormSection, ModalFormFooter } from "@/components/form-sections";

/**
 * Alta y edición de motivos de devolución: una sola sección con nombre y descripción. Los botones quedan fijos al pie
 * del modal.
 */
export const FormMotiveDevolution = ({
  initialValues,
  validationSchema,
  onSubmit,
  mode = "create",
  onCancel,
}: IFormProps<any> & { mode?: "create" | "edit"; onCancel?: () => void }) => {
  const t = useTranslations("Administre.motiveDevolution");
  const tForm = useTranslations("Administre.motiveDevolution.form");
  const tCommon = useTranslations("Administre.common");
  type MotiveDevolutionInputs = z.infer<typeof validationSchema>;

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = useForm<MotiveDevolutionInputs>({
    resolver: zodResolver(validationSchema),
    defaultValues: initialValues,
    mode: "onTouched",
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className='flex flex-col gap-4 pb-1'>
      <FormSection icon={HiOutlineChatBubbleLeftEllipsis} title={tForm("identity.title")} hint={tForm("identity.hint")}>
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
          rows={3}
          className='col-span-12'
        />
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
