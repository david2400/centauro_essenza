/** @format */

"use client";

import { useTranslations } from "next-intl";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormTextAreaField } from "@repo/ui/form/scenes/form-area";
import { FormSelectField } from "@repo/ui/form/scenes/form-select";
import {
  HiOutlineBuildingStorefront,
  HiOutlineClipboardDocumentCheck,
  HiOutlinePencilSquare,
  HiOutlineSparkles,
} from "react-icons/hi2";
import { FormSection, ModalFormFooter, Segmented, ToggleRow } from "@/components/form-sections";
import { DETAIL_CONDITIONS, formatMoney, lineValue, RESTOCK_BY_DEFAULT } from "../../constants";
import type { IDevolutionOption, IReturnableOrder } from "../../models/devolution.interface";
import { toId, validationInspect, type InspectFormValues } from "../../schemas/devolution.schema";
import { inspectReturnServerAction } from "@/app/[locale]/postventa/devolutions/actions";
import { idOrEmpty, toOptions, useFlowFeedback, type DialogProps } from "./shared";

export const InspectForm = ({
  devolution,
  onClose,
  returnable,
  warehouses,
}: DialogProps & { returnable: IReturnableOrder | null; warehouses: IDevolutionOption[] }) => {
  const t = useTranslations("Administre.devolution");
  const tf = useTranslations("Administre.devolution.flow");
  const tc = useTranslations("Administre.devolution.details.conditions");
  const tForm = useTranslations("Administre.devolution.form");
  const tCommon = useTranslations("Administre.common");
  const feedback = useFlowFeedback(onClose);
  const details = devolution.details ?? [];
  const valueOf = (productOrderId?: number, received?: number) => {
    const line = returnable?.lines?.find((item) => item.product_order_id === productOrderId);
    return lineValue(line?.total, line?.sold, received ?? 0);
  };
  const { control, handleSubmit, setValue, formState } = useForm<InspectFormValues>({
    resolver: zodResolver(validationInspect()),
    defaultValues: {
      by: "",
      notes: "",
      warehouse_id: idOrEmpty(devolution.warehouse_id),
      lines: details.map((detail) => ({
        detail_id: detail.id ?? 0,
        value: valueOf(detail.product_order_id, detail.received_quantity),
        condition: "NEW",
        restock: true,
        restocking_fee: 0,
      })),
    },
    mode: "onTouched",
  });
  const { fields } = useFieldArray({ control, name: "lines" });
  const lines = useWatch({ control, name: "lines" });
  const credit = (lines ?? []).reduce(
    (sum, line) => sum + Math.max(0, (line?.value ?? 0) - (Number(line?.restocking_fee) || 0)),
    0,
  );
  const submit = async (values: InspectFormValues) => {
    const result = await inspectReturnServerAction(devolution.id as number, {
      by: values.by || undefined,
      notes: values.notes || undefined,
      warehouse_id: toId(values.warehouse_id),
      lines: values.lines.map((line) => ({
        detail_id: line.detail_id,
        condition: line.condition,
        restock: line.restock,
        restocking_fee: Number(line.restocking_fee) || 0,
      })),
    });
    feedback(result, "inspected");
  };
  return (
    <form onSubmit={handleSubmit(submit)} noValidate className='flex flex-col gap-4 pb-1'>
      <FormSection icon={HiOutlineClipboardDocumentCheck} title={tf("sections.inspection")} hint={tf("inspectHint")}>
        <ul className='col-span-12 grid gap-3'>
          {fields.map((field, index) => {
            const detail = details[index];
            const received = detail?.received_quantity ?? 0;
            const line = lines?.[index];
            return (
              <li key={field.id} className='grid gap-3 rounded-xl border border-border p-3'>
                <div className='flex flex-wrap items-baseline justify-between gap-2'>
                  <p className='text-sm font-medium'>{detail?.product_name ?? `#${detail?.product_order_id}`}</p>
                  <p className='text-xs text-muted-foreground'>
                    {tf("receivedValue", { count: received, value: formatMoney(line?.value) })}
                  </p>
                </div>
                {received === 0 ? (
                  <p className='text-xs text-muted-foreground'>{tf("nothingReceived")}</p>
                ) : (
                  <>
                    <Segmented
                      label={t("details.fields.condition")}
                      value={(line?.condition ?? "NEW") as (typeof DETAIL_CONDITIONS)[number]}
                      options={DETAIL_CONDITIONS.map((value) => ({ value, label: tc(value) }))}
                      onChange={(value) => {
                        setValue(`lines.${index}.condition`, value, { shouldDirty: true });
                        setValue(`lines.${index}.restock`, RESTOCK_BY_DEFAULT[value], { shouldDirty: true });
                      }}
                    />
                    <div className='grid gap-3 sm:grid-cols-2'>
                      <ToggleRow
                        id={`restock-${detail?.id}`}
                        label={tf("restock")}
                        description={tf("restockHint")}
                        checked={Boolean(line?.restock)}
                        onChange={(checked) => setValue(`lines.${index}.restock`, checked, { shouldDirty: true })}
                      />
                      <FormField
                        controller={{ control, name: `lines.${index}.restocking_fee` }}
                        type='number'
                        inputMode='decimal'
                        min={0}
                        step='any'
                        prefix='$'
                        classNameInput='tabular-nums'
                        label={t("details.fields.restockingFee")}
                        description={tf("feeHint")}
                      />
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>

        <p
          className='col-span-12 flex items-start gap-3 rounded-lg border border-dashed border-border bg-muted/40 p-3 text-sm'
          aria-live='polite'>
          <HiOutlineSparkles className='mt-0.5 h-4 w-4 shrink-0 text-primary' aria-hidden='true' />
          <span>
            {tf("creditPreview")} <strong className='tabular-nums'>{formatMoney(credit)}</strong>
          </span>
        </p>
      </FormSection>

      <FormSection icon={HiOutlineBuildingStorefront} title={tf("sections.restock")} hint={tf("warehouseHint")}>
        <FormSelectField
          controller={{ control, name: "warehouse_id" }}
          label={tf("warehouse")}
          data={toOptions(warehouses)}
          placeholder={tf("mainWarehouse")}
          triggerClassName='!w-full'
          className='col-span-12 md:col-span-6'
        />
      </FormSection>

      <FormSection
        icon={HiOutlinePencilSquare}
        title={tf("sections.registry")}
        hint={tf("sections.registryHint")}
        badge={tForm("optional")}>
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
          label={t("fields.inspectionNotes")}
          maxLength={255}
          className='col-span-12'
        />
      </FormSection>

      <ModalFormFooter
        cancelLabel={tCommon("cancel")}
        onCancel={onClose}
        submitting={formState.isSubmitting}
        submitLabel={tf("submit.inspect")}
      />
    </form>
  );
};
