/** @format */

"use client";

import { useState, type ComponentType } from "react";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "@repo/ui/form/scenes/form-field";
import type { IFormProps } from "@repo/ui/form/models/form.interface";
import type { ISelectOption } from "@repo/ui/form/models";
import {
  HiOutlineArrowTopRightOnSquare,
  HiOutlineBanknotes,
  HiOutlineEnvelope,
  HiOutlineGlobeAlt,
  HiOutlineIdentification,
  HiOutlinePhone,
  HiOutlineSparkles,
  HiOutlineUserGroup,
} from "react-icons/hi2";
import { FormSection, ModalFormFooter, SwitchField } from "@/components/form-sections";
import { Link } from "@/shared/i18n/routing";
import { formatMoney } from "@/lib/format";
import { codeFromName } from "../models/carrier.interface";

export type CarrierFormOptions = Partial<Record<string, ISelectOption[]>>;

/** Distancia del ejemplo de costo: suficiente para ver el peso de la tarifa por km. */
const EXAMPLE_KM = 10;
const TARIFF_HREF = "/logistica/shipping-costs";

const Adornment = ({ icon: Icon }: { icon: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }> }) => <Icon className='h-4 w-4 text-muted-foreground' aria-hidden='true' />;

const toNumber = (value: unknown) => {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};

/**
 * Alta y edición de transportadoras, en secciones: identificación, contacto, tarifa de referencia y estado. En el alta
 * el código se sugiere desde el nombre hasta que el usuario lo cambia. Los botones quedan fijos al pie del modal.
 */
export const FormCarrier = ({
  initialValues,
  validationSchema,
  onSubmit,
  mode = "create",
  onCancel,
}: IFormProps<any> & { options?: CarrierFormOptions; mode?: "create" | "edit"; onCancel?: () => void }) => {
  const t = useTranslations("Administre.carrier");
  const tForm = useTranslations("Administre.carrier.form");
  const tCommon = useTranslations("Administre.common");
  type CarrierInputs = z.infer<typeof validationSchema>;

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting, isDirty },
  } = useForm<CarrierInputs>({
    resolver: zodResolver(validationSchema),
    defaultValues: initialValues,
    mode: "onTouched",
  });

  // En el alta el código sigue al nombre hasta que el usuario lo edita a mano.
  const [codeTouched, setCodeTouched] = useState(mode === "edit" || Boolean(initialValues?.code));
  const [baseRate, ratePerKm, maxDays] = useWatch({ control, name: ["base_rate", "rate_per_km", "max_delivery_days"] as never });
  const base = toNumber(baseRate);
  const perKm = toNumber(ratePerKm);
  const days = toNumber(maxDays);
  const canPreview = base > 0 && perKm > 0 && days >= 1;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className='flex flex-col gap-4 pb-1'>
      <FormSection icon={HiOutlineIdentification} title={tForm("identity.title")} hint={tForm("identity.hint")}>
        <FormField
          controller={{ control, name: "name" }}
          label={t("fields.name")}
          required
          autoFocus
          autoComplete='organization'
          placeholder={tForm("placeholders.name")}
          maxLength={120}
          onChange={(event) => {
            if (!codeTouched) {
              setValue("code", codeFromName(event.target.value), { shouldDirty: true, shouldValidate: false });
            }
          }}
          className='col-span-12 md:col-span-7'
        />
        <FormField
          controller={{ control, name: "code" }}
          label={t("fields.code")}
          required
          placeholder={tForm("placeholders.code")}
          maxLength={30}
          autoCapitalize='characters'
          spellCheck={false}
          classNameInput='font-mono uppercase tracking-wide'
          onChange={(event) => {
            setCodeTouched(true);
            setValue("code", codeFromName(event.target.value, { keepEdges: true }), { shouldDirty: true });
          }}
          className='col-span-12 md:col-span-5'
        />
        {/* La ayuda va debajo (no como descripción del campo) para que los dos inputs queden alineados. */}
        <p className='col-span-12 -mt-2 text-xs text-muted-foreground md:col-span-5 md:col-start-8'>
          {codeTouched ? tForm("hints.code") : tForm("hints.codeAuto")}
        </p>
      </FormSection>

      <FormSection icon={HiOutlineUserGroup} title={tForm("contact.title")} hint={tForm("contact.hint")} badge={tForm("optional")}>
        <FormField
          controller={{ control, name: "contact_email" }}
          label={t("fields.contactEmail")}
          type='email'
          inputMode='email'
          autoComplete='email'
          placeholder={tForm("placeholders.email")}
          icon={<Adornment icon={HiOutlineEnvelope} />}
          className='col-span-12 md:col-span-6'
        />
        <FormField
          controller={{ control, name: "contact_phone" }}
          label={t("fields.contactPhone")}
          type='tel'
          inputMode='tel'
          autoComplete='tel'
          placeholder={tForm("placeholders.phone")}
          icon={<Adornment icon={HiOutlinePhone} />}
          className='col-span-12 md:col-span-6'
        />
        <FormField
          controller={{ control, name: "website" }}
          label={t("fields.website")}
          inputMode='url'
          autoComplete='url'
          spellCheck={false}
          placeholder={tForm("placeholders.website")}
          icon={<Adornment icon={HiOutlineGlobeAlt} />}
          className='col-span-12'
        />
      </FormSection>

      <FormSection icon={HiOutlineBanknotes} title={tForm("rates.title")} hint={tForm("rates.hint")}>
        <FormField
          controller={{ control, name: "base_rate" }}
          label={t("fields.baseRate")}
          required
          type='number'
          inputMode='decimal'
          step='0.01'
          min={0}
          placeholder='0'
          prefix='$'
          classNameInput='tabular-nums'
          className='col-span-12 sm:col-span-4'
        />
        <FormField
          controller={{ control, name: "rate_per_km" }}
          label={t("fields.ratePerKm")}
          required
          type='number'
          inputMode='decimal'
          step='0.01'
          min={0}
          placeholder='0'
          prefix='$'
          suffix={tForm("suffix.perKm")}
          classNameInput='tabular-nums'
          className='col-span-12 sm:col-span-4'
        />
        <FormField
          controller={{ control, name: "max_delivery_days" }}
          label={t("fields.maxDeliveryDays")}
          required
          type='number'
          inputMode='numeric'
          step='1'
          min={1}
          suffix={tForm("suffix.days")}
          classNameInput='tabular-nums'
          className='col-span-12 sm:col-span-4'
        />

        <div
          className='col-span-12 flex items-start gap-3 rounded-lg border border-dashed border-border bg-muted/40 p-3 text-sm'
          aria-live='polite'>
          <HiOutlineSparkles className='mt-0.5 h-4 w-4 shrink-0 text-primary' aria-hidden='true' />
          <div className='min-w-0 space-y-1'>
            <p className='text-foreground'>
              {canPreview
                ? tForm("preview.example", { km: EXAMPLE_KM, amount: formatMoney(base + perKm * EXAMPLE_KM), days })
                : tForm("preview.empty")}
            </p>
            <Link
              href={TARIFF_HREF}
              target='_blank'
              className='inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline'>
              {tForm("preview.tariffLink")}
              <HiOutlineArrowTopRightOnSquare className='h-3.5 w-3.5' aria-hidden='true' />
              <span className='sr-only'>{tForm("preview.newTab")}</span>
            </Link>
          </div>
        </div>
      </FormSection>

      <SwitchField
        control={control}
        name={"is_active" as never}
        id='carrier-is-active'
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
