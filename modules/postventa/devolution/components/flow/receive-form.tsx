/** @format */

"use client";

import { useTranslations } from "next-intl";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormTextAreaField } from "@repo/ui/form/scenes/form-area";
import { HiOutlineArchiveBoxArrowDown, HiOutlinePencilSquare } from "react-icons/hi2";
import { FormSection, ModalFormFooter } from "@/components/form-sections";
import { validationReceive, type ReceiveFormValues } from "../../schemas/devolution.schema";
import { receiveReturnServerAction } from "@/app/[locale]/postventa/devolutions/actions";
import { useFlowFeedback, type DialogProps } from "./shared";

export const ReceiveForm = ({ devolution, onClose }: DialogProps) => {
  const t = useTranslations("Administre.devolution");
  const tf = useTranslations("Administre.devolution.flow");
  const tForm = useTranslations("Administre.devolution.form");
  const tCommon = useTranslations("Administre.common");
  const feedback = useFlowFeedback(onClose);
  const details = devolution.details ?? [];
  const { control, handleSubmit, formState } = useForm<ReceiveFormValues>({
    resolver: zodResolver(validationReceive()),
    defaultValues: {
      by: "",
      notes: "",
      lines: details.map((detail) => ({
        detail_id: detail.id ?? 0,
        max: detail.quantity ?? 0,
        received_quantity: detail.quantity ?? 0,
      })),
    },
    mode: "onTouched",
  });
  const { fields } = useFieldArray({ control, name: "lines" });
  const submit = async (values: ReceiveFormValues) => {
    const result = await receiveReturnServerAction(devolution.id as number, {
      by: values.by || undefined,
      notes: values.notes || undefined,
      lines: values.lines.map((line) => ({ detail_id: line.detail_id, received_quantity: Number(line.received_quantity) })),
    });
    feedback(result, "received");
  };
  return (
    <form onSubmit={handleSubmit(submit)} noValidate className='flex flex-col gap-4 pb-1'>
      <FormSection icon={HiOutlineArchiveBoxArrowDown} title={tf("sections.received")} hint={tf("receiveHint")}>
        <ul className='col-span-12 grid gap-2'>
          {fields.map((field, index) => {
            const detail = details[index];
            return (
              <li key={field.id} className='flex items-center justify-between gap-3 rounded-xl border border-border p-3'>
                <div className='min-w-0'>
                  <p className='truncate text-sm font-medium'>{detail?.product_name ?? `#${detail?.product_order_id}`}</p>
                  <p className='text-xs text-muted-foreground'>{tf("requested", { count: detail?.quantity ?? 0 })}</p>
                </div>
                <FormField
                  controller={{ control, name: `lines.${index}.received_quantity` }}
                  type='number'
                  inputMode='numeric'
                  step='1'
                  min={0}
                  max={detail?.quantity ?? 0}
                  size='sm'
                  className='w-28 shrink-0'
                  classNameInput='tabular-nums'
                  aria-label={tf("receivedFor", { name: detail?.product_name ?? "" })}
                  suffix={`/ ${detail?.quantity ?? 0}`}
                />
              </li>
            );
          })}
        </ul>
      </FormSection>

      <FormSection
        icon={HiOutlinePencilSquare}
        title={tf("sections.registry")}
        hint={tf("sections.registryHint")}
        badge={tForm("optional")}>
        <FormField
          controller={{ control, name: "by" }}
          label={t("fields.receivedBy")}
          autoComplete='name'
          maxLength={100}
          placeholder={tf("placeholders.by")}
          className='col-span-12 md:col-span-6'
        />
        <FormTextAreaField
          controller={{ control, name: "notes" }}
          label={tf("notes")}
          maxLength={255}
          className='col-span-12'
        />
      </FormSection>

      <ModalFormFooter
        cancelLabel={tCommon("cancel")}
        onCancel={onClose}
        submitting={formState.isSubmitting}
        submitLabel={tf("submit.receive")}
      />
    </form>
  );
};
