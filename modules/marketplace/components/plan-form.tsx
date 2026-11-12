/** @format */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm, useWatch, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormTextAreaField } from "@repo/ui/form/scenes/form-area";
import { FormSelectField } from "@repo/ui/form/scenes/form-select";
import { Buttons } from "@repo/ui/buttons/scenes";
import { HiOutlineAdjustmentsHorizontal, HiOutlineCalendarDays, HiOutlineIdentification, HiOutlineReceiptPercent } from "react-icons/hi2";
import { ActionBar, SectionCard, Segmented, ToggleRow } from "@/components/form-sections";
import { notify } from "@/components/notifications";
import { Link } from "@/shared/i18n/routing";
import { create_plan_action, update_plan_action } from "@/server/domains/marketplace/actions";
import type { SavePlanRequest } from "@/server/domains/marketplace/types";
import {
  ACCRUAL_EVENTS,
  COMMISSION_BASES,
  FEE_BILLINGS,
  PLAN_CURRENCIES,
  PLANS_HREF,
  REFUND_POLICIES,
  type IPlan,
  type PlanModality,
} from "../models/marketplace.interface";
import { validationPlan, type PlanFormValues } from "../schemas/marketplace.schema";

const str = (value: number | string | null | undefined) => (value == null ? "" : String(value));
const num = (value: string) => (value.trim() === "" ? undefined : Number(value));

const toValues = (plan?: IPlan | null): PlanFormValues => ({
  code: plan?.code ?? "",
  name: plan?.name ?? "",
  description: plan?.description ?? "",
  modality: (plan?.terms.modality as PlanModality) ?? "COMMISSION",
  currency: plan?.terms.currency ?? "COP",
  monthly_fee: plan && plan.terms.monthly_fee > 0 ? str(plan.terms.monthly_fee) : "",
  commission_percent: plan && plan.terms.commission_percent > 0 ? str(plan.terms.commission_percent) : "",
  fixed_fee_per_sale: plan && plan.terms.fixed_fee_per_sale > 0 ? str(plan.terms.fixed_fee_per_sale) : "",
  commission_base: plan?.terms.commission_base ?? "ITEMS_NET_OF_DISCOUNTS",
  include_shipping: Boolean(plan?.terms.include_shipping),
  include_taxes: Boolean(plan?.terms.include_taxes),
  accrual_event: plan?.terms.accrual_event ?? "ORDER_DELIVERED",
  return_window_days: str(plan?.terms.return_window_days ?? ""),
  refund_policy: plan?.terms.refund_policy ?? "REVERSE_PROPORTIONAL",
  fee_billing: plan?.terms.fee_billing ?? "IN_ADVANCE",
  grace_days: str(plan?.terms.grace_days ?? 5),
  late_interest_monthly_percent: str(plan?.terms.late_interest_monthly_percent ?? ""),
  storage_fee_per_unit_day: str(plan?.terms.storage_fee_per_unit_day ?? ""),
  valid_from: plan?.valid_from ?? "",
  valid_to: plan?.valid_to ?? "",
});

/**
 * Borrador de plan comercial. Reglas concretas (sin motor genérico): modalidad, importes con
 * moneda, base de comisión, envío/impuestos, exigibilidad, ajustes por devolución y mora.
 */
export const PlanForm = ({ plan }: { plan?: IPlan | null }) => {
  const t = useTranslations("Administre.marketplace.plan");
  const tf = useTranslations("Administre.marketplace.plan.form");
  const tOpt = useTranslations("Administre.marketplace.plan.options");
  const tModalities = useTranslations("Administre.marketplace.plan.modalities");
  const tCommon = useTranslations("Administre.common");
  const router = useRouter();
  const isNew = plan?.id == null;
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { control, handleSubmit, setValue, setError, formState: { isSubmitting, isDirty } } = useForm<PlanFormValues>({
    resolver: zodResolver(validationPlan()),
    // Valida al salir del campo (feedback inmediato) y revalida en cada cambio tras el primer submit.
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: toValues(plan),
  });
  const values = useWatch({ control }) as PlanFormValues;
  const charges = values.modality !== "SUBSCRIPTION";
  const fee = values.modality !== "COMMISSION";

  const submit = async (form: PlanFormValues) => {
    setSubmitError(null);
    const payload: SavePlanRequest = {
      code: isNew ? form.code.trim().toUpperCase() : undefined,
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      modality: form.modality,
      currency: form.currency,
      monthly_fee: fee ? num(form.monthly_fee) : 0,
      commission_percent: charges ? num(form.commission_percent) : 0,
      fixed_fee_per_sale: charges ? num(form.fixed_fee_per_sale) : 0,
      commission_base: form.commission_base,
      include_shipping: form.include_shipping,
      include_taxes: form.include_taxes,
      accrual_event: form.accrual_event,
      return_window_days: num(form.return_window_days),
      refund_policy: form.refund_policy,
      fee_billing: form.fee_billing,
      grace_days: num(form.grace_days),
      late_interest_monthly_percent: num(form.late_interest_monthly_percent),
      storage_fee_per_unit_day: num(form.storage_fee_per_unit_day),
      valid_from: form.valid_from || undefined,
      valid_to: form.valid_to || undefined,
      lock_version: plan?.lock_version,
    };
    const result = isNew ? await create_plan_action(payload) : await update_plan_action(plan!.id, payload);
    if (!result.success) {
      for (const [field, message] of Object.entries(result.field_errors ?? {})) {
        setError(field as Path<PlanFormValues>, { type: "server", message });
      }
      setSubmitError(result.error);
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    notify.success(isNew ? tCommon("createdSuccess") : tCommon("updatedSuccess"), `${result.data.code} v${result.data.version}`);
    router.push(`${PLANS_HREF}/${result.data.id}`);
    router.refresh();
  };

  const select = (list: readonly string[], group: string) => list.map((value) => ({ value, label: tOpt(`${group}.${value}` as never) }));

  return (
    <form onSubmit={handleSubmit(submit)} className='grid gap-6' noValidate>
      <SectionCard id='plan-identity' icon={HiOutlineIdentification} title={tf("identity")} hint={isNew ? tf("identityHint") : tf("draftHint")}>
        <FormField controller={{ control, name: "code" }} label={t("fields.code")} required disabled={!isNew}
          description={isNew ? tf("codeHint") : undefined} className='col-span-12 md:col-span-4' />
        <FormField controller={{ control, name: "name" }} label={t("fields.name")} required className='col-span-12 md:col-span-8' />
        <FormTextAreaField controller={{ control, name: "description" }} label={t("fields.description")} rows={2} className='col-span-12' />
      </SectionCard>

      <SectionCard id='plan-charges' icon={HiOutlineReceiptPercent} title={tf("charges")} hint={tf("chargesHint")}>
        <div className='col-span-12 grid gap-1.5'>
          <span className='text-sm font-medium'>{t("fields.modality")}</span>
          <Segmented label={t("fields.modality")} value={(values.modality ?? "COMMISSION") as PlanModality}
            options={(["COMMISSION", "SUBSCRIPTION", "MIXED"] as const).map((value) => ({ value, label: tModalities(value) }))}
            onChange={(value) => setValue("modality", value, { shouldDirty: true, shouldValidate: true })} />
          <p className='text-xs text-muted-foreground'>{tf(`modalityHint.${values.modality ?? "COMMISSION"}` as never)}</p>
        </div>
        <FormSelectField controller={{ control, name: "currency" }} label={t("fields.currency")}
          data={PLAN_CURRENCIES.map((value) => ({ value, label: value }))} triggerClassName='!w-full' className='col-span-12 md:col-span-3' />
        {fee ? (
          <FormField controller={{ control, name: "monthly_fee" }} label={t("fields.monthlyFee")} inputMode='decimal' required className='col-span-12 md:col-span-3' />
        ) : null}
        {charges ? (
          <>
            <FormField controller={{ control, name: "commission_percent" }} label={t("fields.commissionPercent")}
              type='number' inputMode='decimal' min={0} max={100} step={0.0001}
              description={tf("percentHint")} className='col-span-12 md:col-span-3' />
            <FormField controller={{ control, name: "fixed_fee_per_sale" }} label={t("fields.fixedFee")} inputMode='decimal' className='col-span-12 md:col-span-3' />
          </>
        ) : null}
        <p className='col-span-12 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground'>{tf("roundingHint")}</p>
      </SectionCard>

      {charges ? (
        <SectionCard id='plan-rules' icon={HiOutlineAdjustmentsHorizontal} title={tf("rules")} hint={tf("rulesHint")}>
          <FormSelectField controller={{ control, name: "commission_base" }} label={t("fields.commissionBase")} data={select(COMMISSION_BASES, "commissionBases")}
            triggerClassName='!w-full' className='col-span-12 md:col-span-6' />
          <FormSelectField controller={{ control, name: "accrual_event" }} label={t("fields.accrualEvent")} data={select(ACCRUAL_EVENTS, "accrualEvents")}
            triggerClassName='!w-full' className='col-span-12 md:col-span-6' />
          {values.accrual_event === "RETURN_WINDOW_CLOSED" ? (
            <FormField controller={{ control, name: "return_window_days" }} label={t("fields.returnWindowDays")} inputMode='numeric' required className='col-span-12 md:col-span-4' />
          ) : null}
          <FormSelectField controller={{ control, name: "refund_policy" }} label={t("fields.refundPolicy")} data={select(REFUND_POLICIES, "refundPolicies")}
            triggerClassName='!w-full' className='col-span-12 md:col-span-8' />
          <div className='col-span-12 grid gap-3 md:grid-cols-2'>
            <ToggleRow id='plan-shipping' label={t("fields.includeShipping")} description={tf("shippingHint")} checked={Boolean(values.include_shipping)}
              onChange={(checked) => setValue("include_shipping", checked, { shouldDirty: true })} />
            <ToggleRow id='plan-taxes' label={t("fields.includeTaxes")} description={tf("taxesHint")} checked={Boolean(values.include_taxes)}
              onChange={(checked) => setValue("include_taxes", checked, { shouldDirty: true })} />
          </div>
        </SectionCard>
      ) : null}

      <SectionCard id='plan-billing' icon={HiOutlineCalendarDays} title={tf("billing")} hint={tf("billingHint")}>
        {fee ? (
          <FormSelectField controller={{ control, name: "fee_billing" }} label={t("fields.feeBilling")} data={select(FEE_BILLINGS, "feeBillings")}
            triggerClassName='!w-full' className='col-span-12 md:col-span-4' />
        ) : null}
        <FormField controller={{ control, name: "grace_days" }} label={t("fields.graceDays")} inputMode='numeric' className='col-span-12 md:col-span-4' />
        <FormField controller={{ control, name: "late_interest_monthly_percent" }} label={t("fields.lateInterest")} inputMode='decimal'
          description={tf("lateInterestHint")} className='col-span-12 md:col-span-4' />
        <FormField controller={{ control, name: "storage_fee_per_unit_day" }} label={t("fields.storageFee")} inputMode='decimal'
          description={tf("storageFeeHint")} className='col-span-12 md:col-span-4' />
        <FormField controller={{ control, name: "valid_from" }} type='date' label={t("fields.validFrom")} description={tf("validFromHint")} className='col-span-12 md:col-span-6' />
        <FormField controller={{ control, name: "valid_to" }} type='date' label={t("fields.validTo")} description={tf("validToHint")} className='col-span-12 md:col-span-6' />
      </SectionCard>

      <ActionBar message={submitError ?? (isDirty ? tf("unsaved") : tf("draftNotice"))}>
        <Link href={isNew ? PLANS_HREF : `${PLANS_HREF}/${plan!.id}`}
          className='inline-flex h-10 items-center rounded-full border border-border px-4 text-sm font-medium hover:bg-muted'>
          {tCommon("cancel")}
        </Link>
        <Buttons type='submit' className='rounded-full' loading={isSubmitting}>{isNew ? t("create") : tCommon("save")}</Buttons>
      </ActionBar>
    </form>
  );
};
