/** @format */

"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormTextAreaField } from "@repo/ui/form/scenes/form-area";
import { HiOutlineXCircle } from "react-icons/hi2";
import { FormSection } from "@/components/form-sections";
import { validationReject, type RejectFormValues } from "../../schemas/devolution.schema";
import { rejectReturnServerAction } from "@/app/[locale]/postventa/devolutions/actions";
import { DangerModalFooter, useFlowFeedback, type DialogProps } from "./shared";

export const RejectForm = ({ devolution, onClose }: DialogProps) => {
  const t = useTranslations("Administre.devolution");
  const tf = useTranslations("Administre.devolution.flow");
  const tForm = useTranslations("Administre.devolution.form");
  const tCommon = useTranslations("Administre.common");
  const feedback = useFlowFeedback(onClose);
  const { control, handleSubmit, formState } = useForm<RejectFormValues>({
    resolver: zodResolver(validationReject()),
    defaultValues: { by: "", reason: "" },
    mode: "onTouched",
  });
  const submit = async (values: RejectFormValues) => {
    const result = await rejectReturnServerAction(devolution.id as number, { by: values.by || undefined, reason: values.reason });
    feedback(result, "rejected");
  };
  return (
    <form onSubmit={handleSubmit(submit)} noValidate className='flex flex-col gap-4 pb-1'>
      <FormSection icon={HiOutlineXCircle} title={tf("sections.reject")} hint={tf("rejectHint")}>
        <FormTextAreaField
          controller={{ control, name: "reason" }}
          label={t("rejectReason")}
          required
          autoFocus
          maxLength={255}
          showCounter
          placeholder={tf("placeholders.reason")}
          className='col-span-12'
        />
        <FormField
          controller={{ control, name: "by" }}
          label={tf("by")}
          autoComplete='name'
          maxLength={100}
          placeholder={tf("placeholders.by")}
          className='col-span-12 md:col-span-6'
        />
      </FormSection>
      <DangerModalFooter
        note={tForm("requiredHint")}
        cancelLabel={tCommon("cancel")}
        onCancel={onClose}
        submitting={formState.isSubmitting}
        submitLabel={tf("submit.reject")}
      />
    </form>
  );
};
