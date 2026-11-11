/** @format */

"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormTextAreaField } from "@repo/ui/form/scenes/form-area";
import { FormSelectField } from "@repo/ui/form/scenes/form-select";
import type { IFormProps } from "@repo/ui/form/models/form.interface";
import { HiOutlineChatBubbleBottomCenterText, HiOutlineCube, HiOutlineSparkles } from "react-icons/hi2";
import { FormSection, ModalFormFooter } from "@/components/form-sections";
import type { IReturnableLine } from "../models/devolution.interface";
import { formatMoney } from "../constants";

/**
 * Producto de una devolución pendiente: línea de la orden y cantidad (hasta lo que falta por
 * devolver). El precio lo congela el backend desde la orden; recepción e inspección van por el flujo.
 */
export const FormDevolutionDetail = ({
  initialValues,
  validationSchema,
  onSubmit,
  lines,
  editing,
  onCancel,
}: IFormProps<any> & { lines: IReturnableLine[]; editing?: boolean; onCancel?: () => void }) => {
  const t = useTranslations("Administre.devolution.details");
  const tr = useTranslations("Administre.devolution.request");
  const tForm = useTranslations("Administre.devolution.form");
  const tCommon = useTranslations("Administre.common");
  type DetailInputs = z.infer<typeof validationSchema>;

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = useForm<DetailInputs>({
    resolver: zodResolver(validationSchema),
    defaultValues: initialValues,
    mode: "onTouched",
  });

  const [productOrderId, quantity] = useWatch({ control, name: ["product_order_id", "quantity"] }) as [string, number];
  const selected = lines.find((line) => String(line.product_order_id) === String(productOrderId));

  const lineOptions = useMemo(
    () =>
      lines
        .filter((line) => line.product_order_id != null && ((line.returnable ?? 0) > 0 || editing))
        .map((line) => ({
          value: String(line.product_order_id),
          label: `${line.product_name ?? `#${line.product_order_id}`} · ${tr("availableShort", { count: line.returnable ?? 0 })}`,
        })),
    [lines, tr, editing],
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className='flex flex-col gap-4 pb-1'>
      <FormSection icon={HiOutlineCube} title={tForm("detail.title")} hint={tForm("detail.hint")}>
        <FormSelectField
          controller={{ control, name: "product_order_id" }}
          label={t("fields.productOrderId")}
          required
          data={lineOptions}
          placeholder={tCommon("selectPlaceholder")}
          searchable
          disabled={editing}
          triggerClassName='!w-full'
          className='col-span-12 md:col-span-8'
        />
        <FormField
          controller={{ control, name: "quantity" }}
          type='number'
          inputMode='numeric'
          step='1'
          min={1}
          max={selected?.returnable}
          required
          label={t("fields.quantity")}
          suffix={`/ ${selected?.returnable ?? "–"}`}
          classNameInput='tabular-nums'
          className='col-span-12 md:col-span-4'
        />
        {/* La ayuda va debajo de la fila para que el select y la cantidad queden alineados. */}
        <p className='col-span-12 -mt-2 text-xs text-muted-foreground'>
          {editing
            ? tForm("detail.lockedHint")
            : selected
              ? tr("availableShort", { count: selected.returnable ?? 0 })
              : tForm("detail.chooseProduct")}
        </p>

        <div
          className='col-span-12 flex items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-muted/40 p-3 text-sm'
          aria-live='polite'>
          <span className='inline-flex items-center gap-2 text-muted-foreground'>
            <HiOutlineSparkles className='h-4 w-4 shrink-0 text-primary' aria-hidden='true' />
            {tr("estimated")}
          </span>
          <span className='text-lg font-semibold tabular-nums text-foreground'>
            {formatMoney((Number(quantity) || 0) * (selected?.unit_price ?? 0))}
          </span>
        </div>
      </FormSection>

      <FormSection icon={HiOutlineChatBubbleBottomCenterText} title={tForm("detail.notesTitle")} hint={tForm("detail.notesHint")}>
        <FormTextAreaField
          controller={{ control, name: "observation" }}
          label={t("fields.observation")}
          required
          maxLength={255}
          showCounter
          placeholder={tForm("detail.observationPlaceholder")}
          className='col-span-12'
        />
      </FormSection>

      <ModalFormFooter
        note={tForm("requiredHint")}
        cancelLabel={tCommon("cancel")}
        onCancel={onCancel}
        submitting={isSubmitting}
        submitDisabled={editing && !isDirty}
        submitLabel={editing ? tForm("submitEdit") : tForm("detail.submitCreate")}
      />
    </form>
  );
};
