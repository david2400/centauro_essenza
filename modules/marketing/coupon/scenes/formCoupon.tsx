/** @format */

"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormTextAreaField } from "@repo/ui/form/scenes/form-area";
import { Buttons } from "@repo/ui/buttons/scenes/index";
import type { IFormProps } from "@repo/ui/form/models/form.interface";
import {
  HiOutlineAdjustmentsHorizontal,
  HiOutlineArrowPath,
  HiOutlineBanknotes,
  HiOutlineCalendarDays,
  HiOutlineEye,
  HiOutlineReceiptPercent,
  HiOutlineSparkles,
  HiOutlineTag,
  HiOutlineTicket,
  HiOutlineTruck,
} from "react-icons/hi2";
import { ChoiceCard, FormSection, ModalFormFooter, Segmented, SwitchField } from "@/components/form-sections";
import { formatMoney } from "@/lib/format";
import { DISCOUNT_TYPES, type DiscountType, type INamedItem } from "../models/coupon.interface";
import { CouponRulesSection } from "../components/coupon-rules-section";
import {
  normalizeCouponCode,
  parseInputDateTime,
  previewCouponDiscount,
  randomCouponCode,
  toLocalInput,
  toNumber,
} from "../utils";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Duraciones rápidas de la vigencia, en días desde "Válido desde". */
const DURATION_PRESETS = ["7", "15", "30", "90"] as const;
type DurationPreset = (typeof DURATION_PRESETS)[number] | "";

const TYPE_ICONS: Record<DiscountType, typeof HiOutlineReceiptPercent> = {
  PERCENTAGE: HiOutlineReceiptPercent,
  FIXED_AMOUNT: HiOutlineBanknotes,
  FREE_SHIPPING: HiOutlineTruck,
};

/**
 * Alta y edición de cupones en secciones: identificación, descuento (con vista previa en vivo), condiciones de uso,
 * vigencia, reglas de catálogo y disponibilidad. En el alta el código se sugiere desde el nombre hasta que el usuario
 * lo edita. Los botones quedan fijos al pie del modal.
 */
export const FormCoupon = ({
  initialValues,
  validationSchema,
  onSubmit,
  categories,
  mode = "create",
  onCancel,
}: IFormProps<any> & { categories: INamedItem[]; mode?: "create" | "edit"; onCancel?: () => void }) => {
  const t = useTranslations("Administre.coupon");
  const tForm = useTranslations("Administre.coupon.form");
  const tCommon = useTranslations("Administre.common");
  const format = useFormatter();
  type CouponInputs = z.infer<typeof validationSchema>;

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { isSubmitting, isDirty },
  } = useForm<CouponInputs>({
    resolver: zodResolver(validationSchema),
    defaultValues: initialValues,
    mode: "onTouched",
  });

  // En el alta el código sigue al nombre hasta que el usuario lo edita (o lo genera) a mano.
  const [codeTouched, setCodeTouched] = useState(mode === "edit" || Boolean(initialValues?.code));

  // Solo los campos que alimentan la vista previa y los avisos (no todo el formulario).
  const [
    discountType,
    discountValue,
    maxDiscount,
    minOrder,
    usageLimit,
    validFrom,
    validUntil,
  ] = useWatch({
    control,
    name: [
      "discount_type",
      "discount_value",
      "maximum_discount_amount",
      "minimum_order_amount",
      "usage_limit",
      "valid_from",
      "valid_until",
    ] as never,
  }) as unknown as [
    DiscountType,
    unknown,
    unknown,
    unknown,
    unknown,
    string,
    string,
  ];

  const isPercent = discountType === "PERCENTAGE";
  const isFreeShipping = discountType === "FREE_SHIPPING";
  const value = toNumber(discountValue);
  const cap = toNumber(maxDiscount);
  const minimum = toNumber(minOrder);
  const uses = toNumber(usageLimit);

  // ── Vigencia ──────────────────────────────────────────────────────────────
  const from = parseInputDateTime(validFrom);
  const until = parseInputDateTime(validUntil);
  const durationMs = from && until ? until.getTime() - from.getTime() : NaN;
  const durationDays = durationMs > 0 ? Math.round(durationMs / DAY_MS) : 0;
  const activePreset: DurationPreset =
    durationMs > 0 && durationMs % DAY_MS === 0
      ? (DURATION_PRESETS.find((days) => Number(days) === durationDays) ?? "")
      : "";
  const startsLater = from != null && from.getTime() > Date.now() + 60_000;

  const applyPreset = (days: DurationPreset) => {
    if (!days) return;
    const start = parseInputDateTime(getValues("valid_from" as never)) ?? new Date();
    setValue("valid_until" as never, toLocalInput(new Date(start.getTime() + Number(days) * DAY_MS)) as never, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  // ── Vista previa ──────────────────────────────────────────────────────────
  const canPreview = isFreeShipping || value > 0;
  const example = previewCouponDiscount({
    type: discountType,
    value: value > 0 ? value : 0,
    maxDiscount: cap > 0 ? cap : 0,
    minOrder: minimum > 0 ? minimum : 0,
  });
  const offer = isFreeShipping
    ? tForm("preview.offer.FREE_SHIPPING")
    : isPercent
      ? cap > 0
        ? tForm("preview.offer.PERCENTAGE_CAP", { value, max: formatMoney(cap) })
        : tForm("preview.offer.PERCENTAGE", { value })
      : tForm("preview.offer.FIXED_AMOUNT", { amount: formatMoney(value) });

  const changeType = (type: DiscountType) => {
    setValue("discount_type" as never, type as never, { shouldDirty: true, shouldValidate: true });
    // El tope solo aplica a porcentajes: se limpia para no enviar un valor oculto.
    if (type !== "PERCENTAGE" && getValues("maximum_discount_amount" as never) !== "") {
      setValue("maximum_discount_amount" as never, "" as never, { shouldDirty: true });
    }
  };

  const setCode = (code: string) => {
    setCodeTouched(true);
    setValue("code" as never, code as never, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className='flex flex-col gap-4 pb-1'>
      {/* ── Identificación ─────────────────────────────────────────────── */}
      <FormSection icon={HiOutlineTag} title={tForm("identity.title")} hint={tForm("identity.hint")}>
        <FormField
          controller={{ control, name: "name" }}
          label={t("fields.name")}
          required
          autoFocus
          autoComplete='off'
          placeholder={tForm("placeholders.name")}
          maxLength={255}
          onChange={(event) => {
            if (!codeTouched) {
              setValue("code" as never, normalizeCouponCode(event.target.value) as never, { shouldDirty: true });
            }
          }}
          className='col-span-12 md:col-span-7'
        />
        <FormField
          controller={{ control, name: "code" }}
          label={t("fields.code")}
          required
          placeholder={tForm("placeholders.code")}
          maxLength={50}
          autoComplete='off'
          autoCapitalize='characters'
          spellCheck={false}
          icon={<HiOutlineTicket className='h-4 w-4 text-muted-foreground' aria-hidden='true' />}
          classNameInput='font-mono uppercase tracking-wide'
          onChange={(event) => setCode(normalizeCouponCode(event.target.value, { keepEdges: true }))}
          className='col-span-12 md:col-span-5'
        />
        {/* Ayuda debajo de la fila para que los dos inputs queden alineados. */}
        <div className='col-span-12 -mt-2 flex flex-wrap items-center justify-between gap-2 md:col-span-5 md:col-start-8'>
          <p className='text-xs text-muted-foreground'>{codeTouched ? tForm("hints.code") : tForm("hints.codeAuto")}</p>
          <Buttons
            type='button'
            variant='ghost'
            size='sm'
            className='h-7 rounded-full px-2 text-xs'
            onClick={() => setCode(randomCouponCode(getValues("name" as never)))}>
            <HiOutlineArrowPath className='mr-1 h-3.5 w-3.5' aria-hidden='true' />
            {tForm("actions.generateCode")}
          </Buttons>
        </div>
        <FormTextAreaField
          controller={{ control, name: "description" }}
          label={`${t("fields.description")} (${tForm("optional").toLowerCase()})`}
          placeholder={tForm("placeholders.description")}
          maxLength={1000}
          rows={2}
          className='col-span-12'
        />
      </FormSection>

      {/* ── Descuento ──────────────────────────────────────────────────── */}
      <FormSection icon={HiOutlineReceiptPercent} title={tForm("discount.title")} hint={tForm("discount.hint")}>
        <div role='radiogroup' aria-label={t("fields.discountType")} className='col-span-12 grid gap-3 sm:grid-cols-3'>
          {DISCOUNT_TYPES.map((type) => (
            <ChoiceCard
              key={type}
              name='coupon-discount-type'
              value={type}
              icon={TYPE_ICONS[type]}
              title={t(`types.${type}`)}
              description={tForm(`typeDescriptions.${type}`)}
              selected={discountType === type}
              onSelect={() => changeType(type)}
            />
          ))}
        </div>

        <FormField
          controller={{ control, name: "discount_value" }}
          label={isPercent ? t("fields.discountPercent") : t("fields.discountValue")}
          required
          type='number'
          inputMode='decimal'
          step={isPercent ? "0.5" : "100"}
          min={0}
          max={isPercent ? 100 : undefined}
          placeholder='0'
          // El sufijo siempre está; solo cambia su texto (si apareciera/desapareciera, el input perdería el foco).
          suffix={<span>{isPercent ? "%" : tForm("suffix.currency")}</span>}
          classNameInput='tabular-nums'
          className='col-span-12 sm:col-span-6'
        />
        {isPercent ? (
          <FormField
            controller={{ control, name: "maximum_discount_amount" }}
            label={`${t("fields.maximumDiscountAmount")} (${tForm("optional").toLowerCase()})`}
            type='number'
            inputMode='decimal'
            step='100'
            min={0}
            placeholder={tForm("placeholders.noCap")}
            suffix={<span>{tForm("suffix.currency")}</span>}
            classNameInput='tabular-nums'
            className='col-span-12 sm:col-span-6'
          />
        ) : null}
        {isFreeShipping ? (
          <p className='col-span-12 -mt-2 text-xs text-muted-foreground sm:col-span-6'>{tForm("hints.freeShippingValue")}</p>
        ) : null}
      </FormSection>

      {/* ── Condiciones de uso ─────────────────────────────────────────── */}
      <FormSection
        icon={HiOutlineAdjustmentsHorizontal}
        title={tForm("conditions.title")}
        hint={tForm("conditions.hint")}
        badge={tForm("optional")}>
        <FormField
          controller={{ control, name: "minimum_order_amount" }}
          label={t("fields.minimumOrderAmount")}
          type='number'
          inputMode='decimal'
          step='1000'
          min={0}
          placeholder={tForm("placeholders.noMinimum")}
          suffix={<span>{tForm("suffix.currency")}</span>}
          classNameInput='tabular-nums'
          className='col-span-12 sm:col-span-6'
        />
        <FormField
          controller={{ control, name: "usage_limit" }}
          label={t("fields.usageLimit")}
          type='number'
          inputMode='numeric'
          step='1'
          min={1}
          placeholder={tForm("placeholders.unlimited")}
          suffix={<span>{tForm("suffix.uses")}</span>}
          classNameInput='tabular-nums'
          className='col-span-12 sm:col-span-6'
        />
        <p className='col-span-12 -mt-2 text-xs text-muted-foreground'>{tForm("hints.usageLimit")}</p>

        {/* Resumen en vivo de lo que implica lo escrito. */}
        <div
          className='col-span-12 flex items-start gap-3 rounded-lg border border-dashed border-border bg-muted/40 p-3 text-sm'
          aria-live='polite'>
          <HiOutlineSparkles className='mt-0.5 h-4 w-4 shrink-0 text-primary' aria-hidden='true' />
          <div className='min-w-0 space-y-1'>
            <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>{tForm("preview.title")}</p>
            {canPreview ? (
              <>
                <p className='text-foreground'>
                  {offer}{" "}
                  {minimum > 0
                    ? tForm("preview.minimum", { amount: formatMoney(minimum) })
                    : tForm("preview.noMinimum")}{" "}
                  {uses >= 1 ? tForm("preview.uses", { count: uses }) : tForm("preview.unlimited")}
                </p>
                {!isFreeShipping ? (
                  <p className='tabular-nums text-muted-foreground'>
                    {tForm("preview.example", {
                      amount: formatMoney(example.amount),
                      total: formatMoney(example.total),
                      discount: formatMoney(example.discount),
                    })}
                  </p>
                ) : null}
                <p className='text-xs text-muted-foreground'>{tForm("preview.simulatorHint")}</p>
              </>
            ) : (
              <p className='text-muted-foreground'>{tForm("preview.empty")}</p>
            )}
          </div>
        </div>
      </FormSection>

      {/* ── Vigencia ───────────────────────────────────────────────────── */}
      <FormSection
        icon={HiOutlineCalendarDays}
        title={tForm("validity.title")}
        hint={tForm("validity.hint")}>
        <FormField
          controller={{ control, name: "valid_from" }}
          type='datetime-local'
          label={t("fields.validFrom")}
          required
          className='col-span-12 sm:col-span-6'
        />
        <FormField
          controller={{ control, name: "valid_until" }}
          type='datetime-local'
          label={t("fields.validUntil")}
          required
          min={validFrom || undefined}
          className='col-span-12 sm:col-span-6'
        />
        <p className='col-span-12 -mt-2 text-xs text-muted-foreground' aria-live='polite'>
          {durationMs > 0
            ? durationDays >= 1
              ? tForm("validity.duration", { days: durationDays })
              : tForm("validity.durationShort")
            : tForm("validity.durationMissing")}
          {startsLater && from
            ? ` ${tForm("validity.scheduled", { date: format.dateTime(from, { dateStyle: "medium", timeStyle: "short" }) })}`
            : ""}
        </p>
        <div className='col-span-12 flex flex-wrap items-center gap-2'>
          <span className='text-xs font-medium text-muted-foreground'>{tForm("validity.presets")}</span>
          <Segmented<DurationPreset>
            label={tForm("validity.presets")}
            value={activePreset}
            onChange={applyPreset}
            options={DURATION_PRESETS.map((days) => ({
              value: days,
              label: tForm("validity.preset", { days: Number(days) }),
              title: tForm("validity.presetTitle", { days: Number(days) }),
            }))}
          />
        </div>
      </FormSection>

      <CouponRulesSection control={control} categories={categories} />

      {/* ── Disponibilidad ─────────────────────────────────────────────── */}
      <FormSection icon={HiOutlineEye} title={tForm("availability.title")} hint={tForm("availability.hint")}>
        <div className='col-span-12 md:col-span-6'>
          <SwitchField
            control={control}
            name={"is_active" as never}
            id='coupon-is-active'
            label={tForm("active.label")}
            description={tForm("active.description")}
          />
        </div>
        <div className='col-span-12 md:col-span-6'>
          <SwitchField
            control={control}
            name={"is_public" as never}
            id='coupon-is-public'
            label={tForm("public.label")}
            description={tForm("public.description")}
          />
        </div>
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
