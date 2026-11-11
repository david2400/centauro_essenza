/** @format */

"use client";

import { useTranslations } from "next-intl";
import { Controller, useFieldArray, useForm, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  HiOutlineArrowDown,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineArrowUp,
  HiOutlineIdentification,
  HiOutlinePlus,
  HiOutlineQueueList,
  HiOutlineSparkles,
  HiOutlineTrash,
} from "react-icons/hi2";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormSelectField } from "@repo/ui/form/scenes/form-select";
import { FormTextAreaField } from "@repo/ui/form/scenes/form-area";
import { Checkbox } from "@repo/ui/inputs/scenes/checkbox";
import { Buttons } from "@repo/ui/buttons/scenes/index";
import type { IFormProps } from "@repo/ui/form/models/form.interface";
import { EmptyBlock, FormSection, ModalFormFooter } from "@/components/form-sections";
import { Link } from "@/shared/i18n/routing";
import type { IAttributeOption } from "../models/productTemplate.interface";
import type { ProductTemplateFormValues } from "../schemas/productTemplate.schema";

type Flag = "required" | "variant_axis" | "filterable";

/** Pantalla donde se crean los atributos que usa la plantilla. */
const ATTRIBUTES_HREF = "/fichaTecnica/attributes";

const FlagCheckbox = ({
  control,
  index,
  flag,
  label,
  disabled,
  onCheckedChange,
}: {
  control: Control<ProductTemplateFormValues>;
  index: number;
  flag: Flag;
  label: string;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) => (
  <Controller
    control={control}
    name={`attributes.${index}.${flag}` as const}
    render={({ field }) => (
      <label className='inline-flex items-center gap-2 text-sm'>
        <Checkbox
          checked={Boolean(field.value)}
          disabled={disabled}
          onCheckedChange={(checked) => {
            field.onChange(checked === true);
            onCheckedChange?.(checked === true);
          }}
        />
        {label}
      </label>
    )}
  />
);

export const FormProductTemplate = ({
  initialValues,
  validationSchema,
  onSubmit,
  attributes,
  mode = "create",
  onCancel,
}: IFormProps<any> & { attributes: IAttributeOption[]; mode?: "create" | "edit"; onCancel?: () => void }) => {
  const t = useTranslations("Administre.productTemplate");
  const tForm = useTranslations("Administre.productTemplate.form");
  const tAttr = useTranslations("Administre.attribute");
  const tCommon = useTranslations("Administre.common");

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting, isDirty },
  } = useForm<ProductTemplateFormValues>({
    resolver: zodResolver(validationSchema),
    defaultValues: initialValues,
    mode: "onTouched",
  });
  const { fields, append, remove, move } = useFieldArray({ control, name: "attributes" });
  const rows = useWatch({ control, name: "attributes" }) ?? [];

  const byId = new Map(attributes.map((attribute) => [String(attribute.id), attribute]));
  const attributeOptions = attributes
    .filter((attribute) => attribute.id != null)
    .map((attribute) => ({
      id: String(attribute.id),
      value: String(attribute.id),
      label: `${attribute.name ?? `#${attribute.id}`} · ${tAttr(`types.${(attribute.data_type ?? "TEXT") as "TEXT"}`)}`,
    }));

  // Resumen en vivo: solo cuenta las filas con un atributo elegido.
  const chosen = rows
    .map((row) => ({ row, attribute: byId.get(String(row?.attribute_id ?? "")) }))
    .filter((item) => item.attribute != null);
  const axisNames = chosen.filter(({ row }) => row.variant_axis).map(({ attribute }) => attribute?.name ?? `#${attribute?.id}`);
  const sheetCount = chosen.length - axisNames.length;
  const requiredCount = chosen.filter(({ row }) => !row.variant_axis && row.required).length;

  const addAttribute = () =>
    append({ attribute_id: undefined as unknown as number, required: false, variant_axis: false, filterable: true });
  const addButton = (
    <Buttons type='button' variant='outline' size='sm' className='rounded-full' onClick={addAttribute}>
      <HiOutlinePlus className='mr-1 h-4 w-4' aria-hidden='true' />
      {t("addAttribute")}
    </Buttons>
  );

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
          maxLength={500}
          rows={2}
          className='col-span-12'
        />
      </FormSection>

      <FormSection
        icon={HiOutlineQueueList}
        title={t("fields.attributes")}
        hint={t("attributesHint")}
        actions={fields.length > 0 ? addButton : undefined}>
        {fields.length === 0 ? (
          <EmptyBlock
            icon={HiOutlineQueueList}
            title={t("noAttributes")}
            description={tForm("attributes.emptyDescription")}
            action={addButton}
          />
        ) : (
          <ol className='col-span-12 space-y-3'>
            {fields.map((field, index) => {
              const selected = byId.get(String(rows[index]?.attribute_id ?? ""));
              const isOption = selected?.data_type === "OPTION";
              const isAxis = Boolean(rows[index]?.variant_axis);
              return (
                <li key={field.id} className='rounded-lg border border-border/70 bg-background p-3'>
                  <div className='flex items-start gap-2'>
                    <FormSelectField
                      controller={{ control, name: `attributes.${index}.attribute_id` as const }}
                      label={t("attributeLabel", { index: index + 1 })}
                      required
                      data={attributeOptions}
                      placeholder={tCommon("selectPlaceholder")}
                      searchable={true}
                      triggerClassName='!w-full'
                      className='min-w-0 flex-1'
                    />
                    <div className='mt-6 flex gap-1'>
                      <Buttons
                        type='button'
                        variant='ghost'
                        size='icon'
                        disabled={index === 0}
                        aria-label={t("moveUp")}
                        onClick={() => move(index, index - 1)}>
                        <HiOutlineArrowUp className='h-4 w-4' aria-hidden='true' />
                      </Buttons>
                      <Buttons
                        type='button'
                        variant='ghost'
                        size='icon'
                        disabled={index === fields.length - 1}
                        aria-label={t("moveDown")}
                        onClick={() => move(index, index + 1)}>
                        <HiOutlineArrowDown className='h-4 w-4' aria-hidden='true' />
                      </Buttons>
                      <Buttons
                        type='button'
                        variant='ghost'
                        size='icon'
                        aria-label={t("removeAttribute", { index: index + 1 })}
                        onClick={() => remove(index)}>
                        <HiOutlineTrash className='h-4 w-4' aria-hidden='true' />
                      </Buttons>
                    </div>
                  </div>
                  <div className='mt-2 flex flex-wrap gap-x-6 gap-y-2'>
                    <FlagCheckbox
                      control={control}
                      index={index}
                      flag='variant_axis'
                      label={t("fields.variantAxis")}
                      disabled={!isOption}
                      onCheckedChange={(checked) => {
                        // Un eje se exige en cada variante: no se marca como obligatorio de ficha.
                        if (checked) setValue(`attributes.${index}.required` as const, false, { shouldDirty: true });
                      }}
                    />
                    <FlagCheckbox
                      control={control}
                      index={index}
                      flag='required'
                      label={t("fields.required")}
                      disabled={isAxis}
                    />
                    <FlagCheckbox control={control} index={index} flag='filterable' label={t("fields.filterable")} />
                  </div>
                  {!isOption && selected ? <p className='mt-1 text-xs text-muted-foreground'>{t("axisHint")}</p> : null}
                </li>
              );
            })}
          </ol>
        )}

        <div
          className='col-span-12 flex items-start gap-3 rounded-lg border border-dashed border-border bg-muted/40 p-3 text-sm'
          aria-live='polite'>
          <HiOutlineSparkles className='mt-0.5 h-4 w-4 shrink-0 text-primary' aria-hidden='true' />
          <div className='min-w-0 space-y-1'>
            {chosen.length > 0 ? (
              <>
                <p className='text-xs text-muted-foreground'>{tForm("preview.title")}</p>
                <p className='text-foreground'>
                  {tForm("preview.sheet", { count: sheetCount, required: requiredCount })}
                </p>
                <p className='text-foreground'>
                  {axisNames.length > 0
                    ? tForm("preview.axes", { axes: axisNames.join(" × ") })
                    : tForm("preview.noAxes")}
                </p>
              </>
            ) : (
              <p className='text-foreground'>{tForm("preview.empty")}</p>
            )}
            <Link
              href={ATTRIBUTES_HREF}
              target='_blank'
              className='inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline'>
              {tForm("preview.attributesLink")}
              <HiOutlineArrowTopRightOnSquare className='h-3.5 w-3.5' aria-hidden='true' />
              <span className='sr-only'>{tForm("preview.newTab")}</span>
            </Link>
          </div>
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
