/** @format */

"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormSelectField } from "@repo/ui/form/scenes/form-select";
import { HiOutlineCheckCircle } from "react-icons/hi2";
import { FormSection, ModalFormFooter } from "@/components/form-sections";
import type { IDevolutionCatalogs } from "../../models/devolution.interface";
import { toId, validationApprove, type ApproveFormValues } from "../../schemas/devolution.schema";
import { approveReturnServerAction } from "@/app/[locale]/postventa/devolutions/actions";
import { idOrEmpty, toOptions, useFlowFeedback, type DialogProps } from "./shared";

export const ApproveForm = ({ devolution, onClose, catalogs }: DialogProps & { catalogs: IDevolutionCatalogs }) => {
  const t = useTranslations("Administre.devolution");
  const tf = useTranslations("Administre.devolution.flow");
  const tCommon = useTranslations("Administre.common");
  const feedback = useFlowFeedback(onClose);
  const { control, handleSubmit, formState } = useForm<ApproveFormValues>({
    resolver: zodResolver(validationApprove()),
    defaultValues: { by: "", return_method_id: idOrEmpty(devolution.return_method_id) },
    mode: "onTouched",
  });
  const submit = async (values: ApproveFormValues) => {
    const result = await approveReturnServerAction(devolution.id as number, {
      by: values.by || undefined,
      return_method_id: toId(values.return_method_id),
    });
    feedback(result, "approved");
  };
  return (
    <form onSubmit={handleSubmit(submit)} noValidate className='flex flex-col gap-4 pb-1'>
      <FormSection icon={HiOutlineCheckCircle} title={tf("sections.approval")} hint={tf("approveHint")}>
        <FormSelectField
          controller={{ control, name: "return_method_id" }}
          label={t("fields.returnMethodId")}
          data={toOptions(catalogs.returnMethods, devolution.return_method_id)}
          placeholder={tCommon("selectPlaceholder")}
          triggerClassName='!w-full'
          className='col-span-12 md:col-span-6'
        />
        <FormField
          controller={{ control, name: "by" }}
          label={t("fields.approvedBy")}
          autoComplete='name'
          maxLength={100}
          placeholder={tf("placeholders.by")}
          className='col-span-12 md:col-span-6'
        />
      </FormSection>
      <ModalFormFooter
        cancelLabel={tCommon("cancel")}
        onCancel={onClose}
        submitting={formState.isSubmitting}
        submitLabel={tf("submit.approve")}
      />
    </form>
  );
};
