/** @format */

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { Buttons } from "@repo/ui/buttons/scenes/index";
import type { IFormProps } from "@repo/ui/form/models/form.interface";
import { SkuLookupField, type ComboOption } from "@/components/async-combobox";
import type { SkuLookupDto } from "@/server/domains/lookups/types";
import type { IOrderItem } from "../models/order.interface";
import { formatMoney } from "../constants";

/** Vista previa de importes (el cálculo definitivo lo hace el backend). */
export const computeItemAmounts = (unitPrice: number | undefined, quantity: number, discount: number) => {
  const subtotal = (unitPrice ?? 0) * (Number(quantity) || 0);
  const total = Math.max(subtotal - (Number(discount) || 0), 0);
  return { subtotal, total };
};

export const FormOrderItem = ({
  initialValues,
  validationSchema,
  onSubmit,
  frozen = null,
}: IFormProps<any> & { frozen?: IOrderItem | null }) => {
  const t = useTranslations("Administre.order.items");
  const tCommon = useTranslations("Administre.common");
  type ItemInputs = z.infer<typeof validationSchema>;

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ItemInputs>({
    resolver: zodResolver(validationSchema),
    defaultValues: initialValues,
  });

  const [skuId, quantity, discount] = useWatch({
    control,
    name: ["sku_id", "quantity", "discount"],
  }) as [string, number, number];

  // SKU elegido en el buscador (precio vigente y disponible).
  const [picked, setPicked] = useState<SkuLookupDto | null>(null);

  // La línea guardada se muestra con su nombre y precio congelados, aunque el SKU ya no esté a la venta.
  const frozenOption: ComboOption<SkuLookupDto> | null =
    frozen?.sku_id != null
      ? {
          value: String(frozen.sku_id),
          label: frozen.product_name ?? `#${frozen.product_id}`,
          hint: [frozen.sku_code, formatMoney(frozen.unit_price)].filter(Boolean).join(" · "),
        }
      : null;

  // Si no cambia el SKU, se conserva el precio congelado de la línea.
  const keepsFrozenPrice = frozen?.sku_id != null && String(frozen.sku_id) === String(skuId);
  const unitPrice = keepsFrozenPrice
    ? frozen?.unit_price
    : picked && String(picked.sku_id) === String(skuId)
      ? picked.unit_price
      : undefined;
  const { subtotal, total } = computeItemAmounts(unitPrice, quantity, discount);
  const available = picked && String(picked.sku_id) === String(skuId) ? picked.available : undefined;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
      <div className='grid grid-cols-12 gap-4'>
        <SkuLookupField
          control={control}
          name='sku_id'
          sellableOnly
          label={t("fields.skuId")}
          description={keepsFrozenPrice ? t("frozenPrice") : t("priceFromSku")}
          placeholder={tCommon("selectPlaceholder")}
          initialOption={frozenOption}
          clearable={false}
          onSelect={(option) => setPicked(option?.data ?? null)}
          className='col-span-12'
        />

        <FormField
          controller={{ control, name: "quantity" }}
          type='number'
          inputMode='numeric'
          step='1'
          min={1}
          label={t("fields.quantity")}
          description={available != null ? t("availableHint", { count: available }) : undefined}
          className='col-span-12 sm:col-span-6'
        />

        <FormField
          controller={{ control, name: "discount" }}
          type='number'
          inputMode='decimal'
          step='0.01'
          min={0}
          label={t("fields.discount")}
          className='col-span-12 sm:col-span-6'
        />
      </div>

      <dl className='grid grid-cols-3 gap-4 rounded-xl border border-border bg-muted/30 p-4 text-sm'>
        <div>
          <dt className='text-muted-foreground'>{t("fields.unitPrice")}</dt>
          <dd className='mt-1 text-lg font-semibold text-foreground'>{formatMoney(unitPrice)}</dd>
        </div>
        <div>
          <dt className='text-muted-foreground'>{t("fields.subtotal")}</dt>
          <dd className='mt-1 text-lg font-semibold text-foreground'>{formatMoney(subtotal)}</dd>
        </div>
        <div>
          <dt className='text-muted-foreground'>{t("fields.total")}</dt>
          <dd className='mt-1 text-lg font-semibold text-foreground'>{formatMoney(total)}</dd>
        </div>
      </dl>

      <Buttons type='submit' loading={isSubmitting} className='w-full rounded-full'>
        {tCommon("save")}
      </Buttons>
    </form>
  );
};
