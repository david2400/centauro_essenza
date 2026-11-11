/** @format */

"use client";

import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormTextAreaField } from "@repo/ui/form/scenes/form-area";
import type { IFormProps } from "@repo/ui/form/models/form.interface";
import { HiOutlineDocumentText, HiOutlineLink, HiOutlinePaperClip } from "react-icons/hi2";
import { FormSection, ModalFormFooter, Segmented } from "@/components/form-sections";
import { EVIDENCE_TYPES } from "../constants";

type EvidenceType = (typeof EVIDENCE_TYPES)[number];

/** Evidencia de una devolución: tipo y enlace al recurso, más una descripción y quién la registra (opcionales). */
export const FormEvidence = ({
  initialValues,
  validationSchema,
  onSubmit,
  onCancel,
}: IFormProps<any> & { onCancel?: () => void }) => {
  const t = useTranslations("Administre.devolution.evidences");
  const tForm = useTranslations("Administre.devolution.form");
  const tCommon = useTranslations("Administre.common");
  type EvidenceInputs = z.infer<typeof validationSchema>;

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<EvidenceInputs>({
    resolver: zodResolver(validationSchema),
    defaultValues: initialValues,
    mode: "onTouched",
  });

  const typeOptions = EVIDENCE_TYPES.map((type) => ({ value: type, label: t(`types.${type}`) }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className='flex flex-col gap-4 pb-1'>
      <FormSection icon={HiOutlinePaperClip} title={tForm("evidence.title")} hint={tForm("evidence.hint")}>
        <div className='col-span-12 flex flex-col gap-2'>
          <span className='text-sm font-semibold'>{t("fields.evidenceType")}</span>
          <Controller
            control={control}
            name={"evidence_type" as never}
            render={({ field }) => (
              <Segmented<EvidenceType>
                label={t("fields.evidenceType")}
                value={field.value as EvidenceType}
                options={typeOptions}
                onChange={field.onChange}
              />
            )}
          />
        </div>
        <FormField
          controller={{ control, name: "resource_url" }}
          type='url'
          inputMode='url'
          autoComplete='url'
          spellCheck={false}
          required
          autoFocus
          label={t("fields.resourceUrl")}
          placeholder='https://'
          icon={<HiOutlineLink className='h-4 w-4 text-muted-foreground' aria-hidden='true' />}
          className='col-span-12'
        />
      </FormSection>

      <FormSection
        icon={HiOutlineDocumentText}
        title={tForm("evidence.detailTitle")}
        hint={tForm("evidence.detailHint")}
        badge={tForm("optional")}>
        <FormTextAreaField
          controller={{ control, name: "description" }}
          label={t("fields.description")}
          placeholder={tForm("evidence.descriptionPlaceholder")}
          className='col-span-12'
        />
        <FormField
          controller={{ control, name: "recorded_by" }}
          label={t("fields.recordedBy")}
          autoComplete='name'
          placeholder={tForm("evidence.recordedByPlaceholder")}
          className='col-span-12 md:col-span-6'
        />
      </FormSection>

      <ModalFormFooter
        note={tForm("requiredHint")}
        cancelLabel={tCommon("cancel")}
        onCancel={onCancel}
        submitting={isSubmitting}
        submitLabel={tForm("evidence.submit")}
      />
    </form>
  );
};
