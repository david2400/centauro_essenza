/** @format */

"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormTextAreaField } from "@repo/ui/form/scenes/form-area";
import type { IFormProps } from "@repo/ui/form/models/form.interface";
import type { ISelectOption } from "@repo/ui/form/models";
import { HiOutlineClipboardDocumentList, HiOutlineIdentification } from "react-icons/hi2";
import { FormSection, ModalFormFooter, SwitchField } from "@/components/form-sections";

export type ReturnMethodFormOptions = Partial<Record<string, ISelectOption[]>>;

/**
 * Alta y edición de métodos de devolución, en secciones: identificación, instrucciones para el cliente y estado.
 * Los botones quedan fijos al pie del modal.
 */
export const FormReturnMethod = ({
  initialValues,
  validationSchema,
  onSubmit,
  mode = "create",
  onCancel,
}: IFormProps<any> & { options?: ReturnMethodFormOptions; mode?: "create" | "edit"; onCancel?: () => void }) => {
  const t = useTranslations("Administre.returnMethod");
  const tForm = useTranslations("Administre.returnMethod.form");
  const tCommon = useTranslations("Administre.common");
  type ReturnMethodInputs = z.infer<typeof validationSchema>;

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = useForm<ReturnMethodInputs>({
    resolver: zodResolver(validationSchema),
    defaultValues: initialValues,
    mode: "onTouched",
  });

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
        icon={HiOutlineClipboardDocumentList}
        title={tForm("instructions.title")}
        hint={tForm("instructions.hint")}
        badge={tForm("optional")}>
        <FormTextAreaField
          controller={{ control, name: "instructions" }}
          label={t("fields.instructions")}
          placeholder={tForm("placeholders.instructions")}
          rows={4}
          className='col-span-12'
        />
      </FormSection>

      <SwitchField
        control={control}
        name={"active" as never}
        id='return-method-active'
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
