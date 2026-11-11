/** @format */

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormSelectField } from "@repo/ui/form/scenes/form-select";
import { FormTextAreaField } from "@repo/ui/form/scenes/form-area";
import type { IFormProps } from "@repo/ui/form/models/form.interface";
import type { ISelectOption } from "@repo/ui/form/models";
import type { IconType } from "react-icons";
import {
  HiOutlineArrowDownTray,
  HiOutlineArrowUpTray,
  HiOutlineArrowsRightLeft,
  HiOutlineBuildingOffice2,
  HiOutlineCube,
  HiOutlineDocumentText,
  HiOutlineExclamationTriangle,
  HiOutlineSparkles,
} from "react-icons/hi2";
import { SkuLookupField } from "@/components/async-combobox";
import { ChoiceCard, FormSection, ModalFormFooter } from "@/components/form-sections";
import { MOVEMENT_TYPES, type MovementType } from "../models/inventory-movement.interface";

const TYPE_ICONS: Record<MovementType, IconType> = {
  ENTRY: HiOutlineArrowDownTray,
  EXIT: HiOutlineArrowUpTray,
  TRANSFER: HiOutlineArrowsRightLeft,
};

const toQuantity = (value: unknown) => {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  return Number.isInteger(n) && n >= 1 ? n : 0;
};

/**
 * Registro de un movimiento de inventario (el kardex es inmutable: no hay edición). El tipo se elige en tarjetas y
 * decide qué bodegas se piden; un resumen en vivo dice qué va a pasar con el stock. Botones fijos al pie del modal.
 */
export const FormInventoryMovement = ({
  initialValues,
  validationSchema,
  onSubmit,
  warehouses,
  onCancel,
}: IFormProps<any> & {
  warehouses: ISelectOption[];
  onCancel?: () => void;
}) => {
  const t = useTranslations("Administre.inventoryMovement");
  const tForm = useTranslations("Administre.inventoryMovement.form");
  const tCommon = useTranslations("Administre.common");
  type MovementInputs = z.infer<typeof validationSchema>;

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<MovementInputs>({
    resolver: zodResolver(validationSchema),
    defaultValues: initialValues,
    mode: "onTouched",
  });

  // Nombre del SKU elegido, solo para el resumen (el formulario guarda el id).
  const [productName, setProductName] = useState("");
  const [typeValue, quantityValue, fromValue, toValue] = useWatch({
    control,
    name: ["type", "quantity", "from_warehouse_id", "to_warehouse_id"] as never,
  });
  const type: MovementType = MOVEMENT_TYPES.includes(typeValue) ? typeValue : "ENTRY";
  const showFrom = type === "EXIT" || type === "TRANSFER";
  const showTo = type === "ENTRY" || type === "TRANSFER";

  const warehouseName = (value: unknown): string => {
    if (!value) return "";
    const label = warehouses.find((option) => String(option.value) === String(value))?.label;
    return typeof label === "string" || typeof label === "number" ? String(label) : `#${value}`;
  };
  const quantity = toQuantity(quantityValue);
  const from = showFrom ? warehouseName(fromValue) : "";
  const to = showTo ? warehouseName(toValue) : "";
  const sameWarehouse = type === "TRANSFER" && Boolean(fromValue) && String(fromValue) === String(toValue);
  const canPreview = Boolean(productName) && quantity > 0 && (!showFrom || from) && (!showTo || to) && !sameWarehouse;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className='flex flex-col gap-4 pb-1'>
      <FormSection icon={TYPE_ICONS[type]} title={tForm("type.title")} hint={tForm("type.hint")}>
        <div role='radiogroup' aria-label={t("fields.type")} className='col-span-12 grid gap-3 sm:grid-cols-3'>
          {MOVEMENT_TYPES.map((value) => (
            <ChoiceCard
              key={value}
              name='inventory-movement-type'
              value={value}
              icon={TYPE_ICONS[value]}
              title={t(`types.${value}`)}
              description={tForm(`type.descriptions.${value}`)}
              selected={type === value}
              onSelect={() => setValue("type", value, { shouldDirty: true, shouldValidate: true })}
            />
          ))}
        </div>
      </FormSection>

      <FormSection icon={HiOutlineCube} title={tForm("product.title")} hint={tForm("product.hint")}>
        <SkuLookupField
          control={control}
          name='sku_id'
          label={t("fields.skuId")}
          required
          placeholder={tCommon("selectPlaceholder")}
          onSelect={(option) => {
            setProductName(option?.label ?? "");
            setValue("product_id", option?.data?.product_id != null ? String(option.data.product_id) : "", {
              shouldValidate: false,
            });
          }}
          className='col-span-12 md:col-span-8'
        />
        <FormField
          controller={{ control, name: "quantity" }}
          label={t("fields.quantity")}
          required
          type='number'
          inputMode='numeric'
          step='1'
          min={1}
          suffix={tForm("suffix.units")}
          classNameInput='tabular-nums'
          className='col-span-12 md:col-span-4'
        />
        {/* La ayuda va debajo para que el buscador y la cantidad queden alineados. */}
        <p className='col-span-12 -mt-2 text-xs text-muted-foreground'>{t("skuHint")}</p>
      </FormSection>

      <FormSection
        icon={HiOutlineBuildingOffice2}
        title={tForm("warehouses.title")}
        hint={tForm(`warehouses.hints.${type}`)}>
        {showFrom ? (
          <FormSelectField
            controller={{ control, name: "from_warehouse_id" }}
            label={t("fields.fromWarehouseId")}
            required
            data={warehouses}
            placeholder={tCommon("selectPlaceholder")}
            triggerClassName='!w-full'
            className={showTo ? "col-span-12 md:col-span-6" : "col-span-12"}
          />
        ) : null}
        {showTo ? (
          <FormSelectField
            controller={{ control, name: "to_warehouse_id" }}
            label={t("fields.toWarehouseId")}
            required
            data={warehouses}
            placeholder={tCommon("selectPlaceholder")}
            triggerClassName='!w-full'
            className={showFrom ? "col-span-12 md:col-span-6" : "col-span-12"}
          />
        ) : null}

        <div
          className='col-span-12 flex items-start gap-3 rounded-lg border border-dashed border-border bg-muted/40 p-3 text-sm'
          aria-live='polite'>
          {sameWarehouse ? (
            <HiOutlineExclamationTriangle className='mt-0.5 h-4 w-4 shrink-0 text-destructive' aria-hidden='true' />
          ) : (
            <HiOutlineSparkles className='mt-0.5 h-4 w-4 shrink-0 text-primary' aria-hidden='true' />
          )}
          <p className='min-w-0 text-foreground'>
            {sameWarehouse
              ? t("sameWarehouse")
              : canPreview
                ? tForm(`preview.${type}`, { quantity, product: productName, from, to })
                : tForm(`preview.empty.${type}`)}
          </p>
        </div>
      </FormSection>

      <FormSection
        icon={HiOutlineDocumentText}
        title={tForm("detail.title")}
        hint={tForm("detail.hint")}
        badge={tForm("optional")}>
        <FormTextAreaField
          controller={{ control, name: "reason" }}
          label={t("fields.reason")}
          placeholder={tForm(`placeholders.reason.${type}`)}
          rows={2}
          className='col-span-12'
        />
      </FormSection>

      <ModalFormFooter
        note={tForm("requiredHint")}
        cancelLabel={tCommon("cancel")}
        onCancel={onCancel}
        submitting={isSubmitting}
        submitLabel={tForm(`submit.${type}`)}
      />
    </form>
  );
};
