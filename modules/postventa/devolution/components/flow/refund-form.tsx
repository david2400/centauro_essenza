/** @format */

"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormTextAreaField } from "@repo/ui/form/scenes/form-area";
import { FormSelectField } from "@repo/ui/form/scenes/form-select";
import { HiOutlineBanknotes, HiOutlineCreditCard } from "react-icons/hi2";
import { FormSection, ModalFormFooter } from "@/components/form-sections";
import { confirm } from "@/components/notifications";
import { formatMoney } from "../../constants";
import type { IDevolutionCatalogs } from "../../models/devolution.interface";
import { toId, validationRefund, type RefundFormValues } from "../../schemas/devolution.schema";
import { refundReturnServerAction } from "@/app/[locale]/postventa/devolutions/actions";
import { idOrEmpty, toOptions, useFlowFeedback, type DialogProps } from "./shared";

export const RefundForm = ({
  devolution,
  onClose,
  catalogs,
  refundable,
}: DialogProps & { catalogs: IDevolutionCatalogs; refundable?: number }) => {
  const t = useTranslations("Administre.devolution");
  const tf = useTranslations("Administre.devolution.flow");
  const tCommon = useTranslations("Administre.common");
  const feedback = useFlowFeedback(onClose);
  const credit = devolution.total_refund_amount ?? 0;
  const suggested = Math.min(credit, refundable ?? credit);
  const { control, handleSubmit, setValue, formState } = useForm<RefundFormValues>({
    resolver: zodResolver(validationRefund()),
    defaultValues: { by: "", refund_method_id: idOrEmpty(devolution.refund_method_id), amount: suggested, notes: "" },
    mode: "onTouched",
  });
  const amount = Number(useWatch({ control, name: "amount" })) || 0;
  useEffect(() => {
    setValue("amount", suggested);
  }, [suggested, setValue]);
  const submit = async (values: RefundFormValues) => {
    // El reembolso mueve dinero y no se deshace desde aquí: se confirma el monto antes de enviarlo.
    const money = Number(values.amount) || 0;
    if (money > 0) {
      const label = tf("submit.refund", { amount: formatMoney(money) });
      const ok = await confirm({ title: label, description: t("refundConfirm", { amount: formatMoney(money) }), confirmLabel: label });
      if (!ok) return;
    }
    const result = await refundReturnServerAction(devolution.id as number, {
      by: values.by || undefined,
      refund_method_id: toId(values.refund_method_id),
      amount: Number(values.amount),
      notes: values.notes || undefined,
    });
    feedback(result, "refunded");
  };
  const storeCredit = Math.max(0, credit - amount);
  return (
    <form onSubmit={handleSubmit(submit)} noValidate className='flex flex-col gap-4 pb-1'>
      <FormSection icon={HiOutlineBanknotes} title={tf("sections.values")} hint={tf("sections.valuesHint")}>
        <dl className='col-span-12 grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/30 p-3 text-sm'>
          <div>
            <dt className='text-xs text-muted-foreground'>{tf("credit")}</dt>
            <dd className='font-semibold tabular-nums'>{formatMoney(credit)}</dd>
          </div>
          <div>
            <dt className='text-xs text-muted-foreground'>{tf("refundable")}</dt>
            <dd className='font-semibold tabular-nums'>{refundable != null ? formatMoney(refundable) : "—"}</dd>
          </div>
        </dl>
        <FormField
          controller={{ control, name: "amount" }}
          type='number'
          inputMode='decimal'
          min={0}
          max={credit}
          step='any'
          prefix='$'
          classNameInput='tabular-nums'
          required
          autoFocus
          label={tf("amount")}
          description={tf("amountHint")}
          className='col-span-12'
        />
        <div className='col-span-12' aria-live='polite'>
          {storeCredit > 0 ? (
            <p role='status' className='rounded-lg bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300'>
              {tf("storeCredit", { amount: formatMoney(storeCredit) })}
            </p>
          ) : null}
        </div>
      </FormSection>

      <FormSection icon={HiOutlineCreditCard} title={tf("sections.method")} hint={tf("sections.registryHint")}>
        <FormSelectField
          controller={{ control, name: "refund_method_id" }}
          label={t("fields.refundMethodId")}
          data={toOptions(catalogs.refundMethods, devolution.refund_method_id)}
          placeholder={tCommon("selectPlaceholder")}
          triggerClassName='!w-full'
          className='col-span-12 md:col-span-6'
        />
        <FormField
          controller={{ control, name: "by" }}
          label={tf("by")}
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
        note={tf("refundHint")}
        cancelLabel={tCommon("cancel")}
        onCancel={onClose}
        submitting={formState.isSubmitting}
        submitLabel={amount > 0 ? tf("submit.refund", { amount: formatMoney(amount) }) : tf("submit.refundCredit")}
      />
    </form>
  );
};
