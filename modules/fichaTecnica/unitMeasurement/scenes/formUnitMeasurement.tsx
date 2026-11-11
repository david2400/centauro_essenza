/** @format */

"use client";

import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormSelectField } from "@repo/ui/form/scenes/form-select";
import {
  HiOutlineAdjustmentsHorizontal,
  HiOutlineArrowsRightLeft,
  HiOutlineIdentification,
  HiOutlineInformationCircle,
  HiOutlineSparkles,
} from "react-icons/hi2";
import { FormSection, ModalFormFooter, SwitchField } from "@/components/form-sections";
import { formatQuantity, UNIT_DIMENSIONS, type IUnit } from "@/shared/units/units";
import type { UnitFormValues, validationUnitMeasurement } from "../schemas/unitMeasurement.schema";

/** "Bulto × 25 kg" → "bulto_25_kg" (igual que el backend). */
const deriveCode = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);

const toNumber = (value: unknown) => {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};

/**
 * Alta y edición de unidades de medida, en secciones: identificación, magnitud y formato, conversión y estado. La
 * conversión muestra en vivo la equivalencia con la unidad base ("1 km = 1.000 m"). Los botones quedan fijos al pie.
 */
export const FormUnitMeasurement = ({
  initialValues,
  validationSchema,
  onSubmit,
  units,
  current,
  mode = "create",
  onCancel,
}: {
  initialValues: UnitFormValues;
  validationSchema: ReturnType<typeof validationUnitMeasurement>;
  onSubmit: (values: UnitFormValues) => Promise<void>;
  /** Todas las unidades (para la base de cada magnitud). */
  units: IUnit[];
  /** Unidad en edición. */
  current?: IUnit | null;
  mode?: "create" | "edit";
  onCancel?: () => void;
}) => {
  const t = useTranslations("Administre.unitMeasurement");
  const tForm = useTranslations("Administre.unitMeasurement.form");
  const tCommon = useTranslations("Administre.common");
  const {
    control,
    handleSubmit,
    formState: { isSubmitting, isDirty, errors },
  } = useForm<UnitFormValues>({
    resolver: zodResolver(validationSchema),
    defaultValues: initialValues,
    mode: "onTouched",
  });

  const [dimension, symbol, factorValue, isBase, name] = useWatch({
    control,
    name: ["dimension", "symbol", "factor", "base", "name"],
  }) as [string, string, number | string | undefined, boolean | string, string];

  const base = units.find((unit) => unit.dimension === dimension && unit.base && unit.id !== current?.id);
  const becomesBase = String(isBase) === "true";
  const isOther = dimension === "OTHER";
  const firstOfDimension = !isOther && !base;
  const editingBase = Boolean(current?.base) && current?.dimension === dimension;
  const factor = toNumber(factorValue);
  const inUse = (current?.usage_count ?? 0) > 0;
  const trimmedSymbol = symbol?.trim() ?? "";
  const shownSymbol = trimmedSymbol || "?";
  const baseSymbol = base?.symbol ?? "";
  const dimensionLabel = t(`dimensions.${(dimension || "OTHER") as "OTHER"}`);
  const canPreview = !firstOfDimension && factor > 0 && Boolean(trimmedSymbol);

  const dimensionOptions = UNIT_DIMENSIONS.map((value) => ({ id: value, value, label: t(`dimensions.${value}`) }));

  const submit = (values: UnitFormValues) =>
    onSubmit({ ...values, code: values.code?.trim() || deriveCode(values.symbol || values.name) });

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className='flex flex-col gap-4 pb-1'>
      <FormSection icon={HiOutlineIdentification} title={tForm("identity.title")} hint={tForm("identity.hint")}>
        <FormField
          controller={{ control, name: "name" }}
          label={t("fields.name")}
          required
          autoFocus
          autoComplete='off'
          placeholder={t("namePlaceholder")}
          maxLength={255}
          className='col-span-12 md:col-span-6'
        />
        <FormField
          controller={{ control, name: "symbol" }}
          label={t("fields.symbol")}
          required
          autoComplete='off'
          spellCheck={false}
          placeholder='ml'
          maxLength={20}
          className='col-span-6 md:col-span-3'
        />
        <FormField
          controller={{ control, name: "code" }}
          label={`${t("fields.code")} (${tForm("optionalLower")})`}
          autoComplete='off'
          spellCheck={false}
          placeholder={deriveCode(symbol || name || "") || "ml"}
          maxLength={20}
          classNameInput='font-mono'
          className='col-span-6 md:col-span-3'
        />
        {/* La ayuda va debajo (no como descripción del campo) para que los inputs queden alineados. */}
        <p className='col-span-12 -mt-2 text-xs text-muted-foreground'>{t("codeHint")}</p>
      </FormSection>

      <FormSection icon={HiOutlineAdjustmentsHorizontal} title={tForm("format.title")} hint={tForm("format.hint")}>
        <FormSelectField
          controller={{ control, name: "dimension" }}
          label={t("fields.dimension")}
          required
          data={dimensionOptions}
          disabled={inUse}
          triggerClassName='!w-full'
          className='col-span-12 sm:col-span-8'
        />
        <FormField
          controller={{ control, name: "decimals" }}
          label={t("fields.decimals")}
          required
          type='number'
          inputMode='numeric'
          step='1'
          min={0}
          max={6}
          classNameInput='tabular-nums'
          className='col-span-12 sm:col-span-4'
        />
        <p className='col-span-12 -mt-2 text-xs text-muted-foreground sm:col-span-8'>
          {inUse ? t("dimensionLocked") : t(`dimensionHints.${(dimension || "OTHER") as "OTHER"}`)}
        </p>
        <p className='col-span-12 -mt-2 text-xs text-muted-foreground sm:col-span-4'>{t("decimalsHint")}</p>
      </FormSection>

      <FormSection
        icon={HiOutlineArrowsRightLeft}
        title={t("conversion")}
        hint={
          isOther
            ? undefined
            : editingBase
              ? tForm("conversion.isBase", { dimension: dimensionLabel })
              : firstOfDimension
                ? t("firstOfDimension")
                : t("conversionHint", { base: baseSymbol })
        }>
        {isOther ? (
          <p className='col-span-12 flex gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground'>
            <HiOutlineInformationCircle className='mt-0.5 h-4 w-4 shrink-0' aria-hidden='true' />
            {t("otherHint")}
          </p>
        ) : null}

        {!firstOfDimension ? (
          <>
            <FormField
              controller={{ control, name: "factor" }}
              label={t("factorLabel", { symbol: shownSymbol, base: baseSymbol })}
              required={!becomesBase}
              type='number'
              inputMode='decimal'
              step='any'
              min={0}
              placeholder='0.001'
              suffix={<span>{baseSymbol || "–"}</span>}
              classNameInput='tabular-nums'
              className='col-span-12'
            />
            <div className='col-span-12'>
              <SwitchField
                control={control}
                name='base'
                id='unit-measurement-base'
                label={tForm("base.label")}
                description={t("baseHint")}
              />
            </div>

            <div
              className='col-span-12 flex items-start gap-3 rounded-lg border border-dashed border-border bg-muted/40 p-3 text-sm'
              aria-live='polite'>
              <HiOutlineSparkles className='mt-0.5 h-4 w-4 shrink-0 text-primary' aria-hidden='true' />
              <div className='min-w-0 space-y-1'>
                {canPreview ? (
                  <>
                    <p className='text-xs text-muted-foreground'>{tForm("preview.title")}</p>
                    <p className='tabular-nums text-foreground'>
                      <strong>1 {trimmedSymbol}</strong> = {formatQuantity(factor, { symbol: baseSymbol }, 10)}
                      <span className='text-muted-foreground'> · </span>
                      <strong>1 {baseSymbol}</strong> = {formatQuantity(1 / factor, { symbol: trimmedSymbol }, 10)}
                    </p>
                    {becomesBase ? (
                      <p className='text-xs text-muted-foreground'>{t("rebaseNotice", { base: baseSymbol })}</p>
                    ) : null}
                  </>
                ) : (
                  <p className='text-foreground'>{tForm("preview.empty", { base: baseSymbol })}</p>
                )}
              </div>
            </div>
          </>
        ) : null}
      </FormSection>

      <div className='space-y-1'>
        <SwitchField
          control={control}
          name='active'
          id='unit-measurement-active'
          label={tForm("active.label")}
          description={tForm("active.description")}
        />
        {/* El interruptor no pinta errores: la regla "la base no se desactiva" se muestra aquí. */}
        {errors.active?.message ? (
          <p role='alert' className='px-1 text-xs font-medium text-destructive'>
            {String(errors.active.message)}
          </p>
        ) : null}
      </div>

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
