/** @format */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormTextAreaField } from "@repo/ui/form/scenes/form-area";
import { FormSelectField } from "@repo/ui/form/scenes/form-select";
import { Buttons } from "@repo/ui/buttons/scenes/index";
import {
  HiOutlineArrowUturnLeft,
  HiOutlineChatBubbleBottomCenterText,
  HiOutlineCube,
  HiOutlineHashtag,
  HiOutlineMagnifyingGlass,
  HiOutlineMinus,
  HiOutlinePlus,
  HiOutlineShoppingBag,
} from "react-icons/hi2";
import { FormSection, ModalFormFooter } from "@/components/form-sections";
import { notify } from "@/components/notifications";
import { cn } from "@/lib/utils";
import { formatMoney } from "../constants";
import type { IDevolutionCatalogs, IDevolutionOption, IReturnableOrder } from "../models/devolution.interface";
import { toId, validationRequestReturn, type RequestReturnFormValues } from "../schemas/devolution.schema";
import { getReturnableServerAction, requestReturnServerAction } from "@/app/[locale]/postventa/devolutions/actions";

const toOptions = (items: IDevolutionOption[]) =>
  items.filter((item) => item.id != null).map((item) => ({ value: String(item.id), label: item.name ?? `#${item.id}` }));

const stepClass =
  "flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40";

/** Unidades enteras entre 0 y lo que queda por devolver. */
const clamp = (value: number, max: number) => Math.min(Math.max(Number.isFinite(value) ? Math.trunc(value) : 0, 0), max);

const EMPTY: RequestReturnFormValues = {
  motive_devolution_id: "",
  return_method_id: "",
  refund_method_id: "",
  observation: "",
  external_reference: "",
  lines: [],
};

/**
 * Solicitud de devolución: se busca la orden, se muestran sus líneas con lo vendido, lo ya
 * devuelto y lo disponible, y se indica cuántas unidades devuelve el cliente. El precio sale
 * de la orden (el backend lo congela); aquí solo se estima el valor.
 */
export const RequestReturnForm = ({
  catalogs,
  orderId: presetOrderId,
  handleClose,
}: {
  catalogs: IDevolutionCatalogs;
  orderId?: number;
  handleClose?: (refresh?: boolean) => void;
}) => {
  const t = useTranslations("Administre.devolution");
  const tr = useTranslations("Administre.devolution.request");
  const tForm = useTranslations("Administre.devolution.form");
  const tCommon = useTranslations("Administre.common");
  const router = useRouter();
  const [orderInput, setOrderInput] = useState(presetOrderId ? String(presetOrderId) : "");
  const [order, setOrder] = useState<IReturnableOrder | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<RequestReturnFormValues>({
    resolver: zodResolver(validationRequestReturn()),
    defaultValues: EMPTY,
    mode: "onTouched",
  });
  const { fields } = useFieldArray({ control, name: "lines" });
  const lines = useWatch({ control, name: "lines" });

  const load = useCallback(
    async (value: string) => {
      const id = Number(value.replace("#", "").trim());
      if (!Number.isInteger(id) || id <= 0) {
        notify.error(tCommon("errorTitle"), tr("orderInvalid"));
        return;
      }
      setLoading(true);
      const result = await getReturnableServerAction(id);
      setLoading(false);
      if (!result.success || !result.data) {
        setOrder(null);
        notify.error(tCommon("errorTitle"), result.success ? tr("orderInvalid") : result.error);
        return;
      }
      setOrder(result.data);
      reset({
        ...EMPTY,
        lines: (result.data.lines ?? []).map((line) => ({
          product_order_id: line.product_order_id ?? 0,
          returnable: line.returnable ?? 0,
          quantity: 0,
          observation: "",
        })),
      });
    },
    [reset, tCommon, tr],
  );

  useEffect(() => {
    if (presetOrderId) void load(String(presetOrderId));
  }, [presetOrderId, load]);

  const estimated = useMemo(() => {
    if (!order) return 0;
    return (lines ?? []).reduce((sum, line, index) => {
      const source = order.lines?.[index];
      return sum + (Number(line?.quantity) || 0) * (source?.unit_price ?? 0);
    }, 0);
  }, [lines, order]);

  const submit = async (values: RequestReturnFormValues) => {
    if (!order?.order_id) return;
    const result = await requestReturnServerAction({
      order_id: order.order_id,
      motive_devolution_id: Number(values.motive_devolution_id),
      return_method_id: toId(values.return_method_id),
      refund_method_id: toId(values.refund_method_id),
      observation: values.observation,
      external_reference: values.external_reference || undefined,
      lines: values.lines
        .filter((line) => line.quantity > 0)
        .map((line) => ({
          product_order_id: line.product_order_id,
          quantity: line.quantity,
          observation: line.observation || undefined,
        })),
    });
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    notify.success(tr("created", { id: result.data?.id ?? "" }));
    handleClose?.(true);
    if (result.data?.id) router.push(`/postventa/devolutions/${result.data.id}`);
    else router.refresh();
  };

  const linesError = (errors.lines as { message?: string; root?: { message?: string } } | undefined);

  return (
    <div className='flex flex-col gap-4 pb-1'>
      {!presetOrderId ? (
        <FormSection icon={HiOutlineShoppingBag} title={tForm("request.orderTitle")} hint={tForm("request.orderHint")}>
          <div className='col-span-12 flex items-end gap-2'>
            <FormField
              id='request-return-order'
              name='order_lookup'
              label={tr("orderLabel")}
              value={orderInput}
              inputMode='numeric'
              autoComplete='off'
              autoFocus
              onChange={(event) => setOrderInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void load(orderInput);
                }
              }}
              placeholder={tr("orderPlaceholder")}
              icon={<HiOutlineHashtag className='h-4 w-4 text-muted-foreground' aria-hidden='true' />}
              classNameInput='tabular-nums'
              className='flex-1'
            />
            <Buttons type='button' variant='outline' className='rounded-full' loading={loading} onClick={() => void load(orderInput)}>
              <HiOutlineMagnifyingGlass className='h-4 w-4' aria-hidden='true' />
              {tr("search")}
            </Buttons>
          </div>
        </FormSection>
      ) : null}

      {order && !order.returnable ? (
        <p role='status' className='rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-800 dark:text-amber-300'>
          {tr("notReturnable", { order: order.order_id ?? "", state: order.order_state ?? "" })}
        </p>
      ) : null}

      {order && order.returnable ? (
        <form onSubmit={handleSubmit(submit)} noValidate className='flex flex-col gap-4'>
          <FormSection icon={HiOutlineCube} title={tForm("request.linesTitle")} hint={tForm("request.linesHint")}>
            <div className='col-span-12 overflow-x-auto rounded-xl border border-border'>
              <table className='w-full min-w-[640px] text-sm'>
                <caption className='sr-only'>{tr("linesCaption", { order: order.order_id ?? "" })}</caption>
                <thead className='bg-muted/40 text-xs text-muted-foreground'>
                  <tr>
                    <th scope='col' className='px-3 py-2 text-left font-medium'>{t("details.fields.productOrderId")}</th>
                    <th scope='col' className='px-3 py-2 text-right font-medium'>{tr("sold")}</th>
                    <th scope='col' className='px-3 py-2 text-right font-medium'>{tr("returned")}</th>
                    <th scope='col' className='px-3 py-2 text-right font-medium'>{t("details.fields.unitPrice")}</th>
                    <th scope='col' className='w-36 px-3 py-2 text-center font-medium'>{tr("toReturn")}</th>
                    <th scope='col' className='px-3 py-2 text-right font-medium'>{tr("subtotal")}</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => {
                    const line = order.lines?.[index];
                    const available = line?.returnable ?? 0;
                    const name = line?.product_name ?? `#${line?.product_order_id}`;
                    const quantity = Number(lines?.[index]?.quantity) || 0;
                    return (
                      <tr key={field.id} className={cn("border-t border-border", quantity > 0 && "bg-primary/5")}>
                        <td className='px-3 py-2'>
                          <p className='font-medium text-foreground'>{name}</p>
                          <p className='font-mono text-xs text-muted-foreground'>{line?.sku_code ?? "—"}</p>
                        </td>
                        <td className='px-3 py-2 text-right tabular-nums'>{line?.sold ?? 0}</td>
                        <td className='px-3 py-2 text-right tabular-nums text-muted-foreground'>{line?.returned ?? 0}</td>
                        <td className='px-3 py-2 text-right tabular-nums'>{formatMoney(line?.unit_price)}</td>
                        <td className='px-3 py-2'>
                          {available === 0 ? (
                            <p className='text-center text-xs text-muted-foreground'>{tr("noneLeft")}</p>
                          ) : (
                            <Controller
                              control={control}
                              name={`lines.${index}.quantity`}
                              render={({ field: qty, fieldState }) => {
                                const value = Number(qty.value) || 0;
                                return (
                                  <div className='flex flex-col items-center gap-1'>
                                    <div
                                      className={cn(
                                        "inline-flex items-center overflow-hidden rounded-lg border bg-background",
                                        fieldState.error ? "border-destructive" : "border-input",
                                      )}>
                                      <button
                                        type='button'
                                        className={stepClass}
                                        disabled={value <= 0}
                                        aria-label={tr("decrease", { name })}
                                        onClick={() => qty.onChange(clamp(value - 1, available))}>
                                        <HiOutlineMinus className='h-4 w-4' aria-hidden='true' />
                                      </button>
                                      <input
                                        ref={qty.ref}
                                        name={qty.name}
                                        type='number'
                                        inputMode='numeric'
                                        min={0}
                                        max={available}
                                        step={1}
                                        value={value}
                                        aria-label={tr("quantityFor", { name })}
                                        aria-invalid={Boolean(fieldState.error)}
                                        onFocus={(event) => event.target.select()}
                                        onBlur={qty.onBlur}
                                        onChange={(event) => qty.onChange(clamp(Number(event.target.value), available))}
                                        className='h-8 w-11 border-x border-input bg-transparent text-center text-sm font-semibold tabular-nums outline-none [appearance:textfield] focus-visible:bg-muted/40 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
                                      />
                                      <button
                                        type='button'
                                        className={stepClass}
                                        disabled={value >= available}
                                        aria-label={tr("increase", { name })}
                                        onClick={() => qty.onChange(clamp(value + 1, available))}>
                                        <HiOutlinePlus className='h-4 w-4' aria-hidden='true' />
                                      </button>
                                    </div>
                                    <span className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                                      {tr("ofAvailable", { count: available })}
                                      {value < available ? (
                                        <button
                                          type='button'
                                          className='font-medium text-primary underline-offset-4 hover:underline'
                                          onClick={() => qty.onChange(available)}>
                                          {tr("all")}
                                        </button>
                                      ) : null}
                                    </span>
                                    {fieldState.error?.message ? (
                                      <span role='alert' className='text-xs text-destructive'>
                                        {fieldState.error.message}
                                      </span>
                                    ) : null}
                                  </div>
                                );
                              }}
                            />
                          )}
                        </td>
                        <td
                          className={cn(
                            "px-3 py-2 text-right tabular-nums",
                            quantity > 0 ? "font-semibold text-foreground" : "text-muted-foreground",
                          )}>
                          {formatMoney(quantity * (line?.unit_price ?? 0))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {linesError?.message || linesError?.root?.message ? (
              <p role='alert' className='col-span-12 -mt-2 text-sm text-destructive'>
                {linesError.message ?? linesError.root?.message}
              </p>
            ) : null}
          </FormSection>

          <FormSection icon={HiOutlineArrowUturnLeft} title={tForm("general.title")} hint={tForm("general.hint")}>
            <FormSelectField
              controller={{ control, name: "motive_devolution_id" }}
              label={t("fields.motiveDevolutionId")}
              required
              data={toOptions(catalogs.motives)}
              placeholder={tCommon("selectPlaceholder")}
              triggerClassName='!w-full'
              className='col-span-12'
            />
            <FormSelectField
              controller={{ control, name: "return_method_id" }}
              label={t("fields.returnMethodId")}
              data={toOptions(catalogs.returnMethods)}
              placeholder={tCommon("selectPlaceholder")}
              triggerClassName='!w-full'
              className='col-span-12 md:col-span-6'
            />
            <FormSelectField
              controller={{ control, name: "refund_method_id" }}
              label={t("fields.refundMethodId")}
              data={toOptions(catalogs.refundMethods)}
              placeholder={tCommon("selectPlaceholder")}
              triggerClassName='!w-full'
              className='col-span-12 md:col-span-6'
            />
          </FormSection>

          <FormSection icon={HiOutlineChatBubbleBottomCenterText} title={tForm("notes.title")} hint={tForm("notes.hint")}>
            <FormTextAreaField
              controller={{ control, name: "observation" }}
              label={t("fields.observation")}
              required
              maxLength={255}
              showCounter
              placeholder={tForm("placeholders.observation")}
              className='col-span-12'
            />
            <FormField
              controller={{ control, name: "external_reference" }}
              label={t("fields.externalReference")}
              maxLength={50}
              spellCheck={false}
              placeholder={tForm("placeholders.externalReference")}
              className='col-span-12 md:col-span-6'
            />
            <p className='col-span-12 -mt-2 text-xs text-muted-foreground'>{tr("externalReferenceHint")}</p>
          </FormSection>

          <ModalFormFooter
            note={
              <span aria-live='polite'>
                {tr("estimated")} <strong className='tabular-nums text-foreground'>{formatMoney(estimated)}</strong>
                <span className='block'>{tr("estimatedHint")}</span>
              </span>
            }
            cancelLabel={handleClose ? tCommon("cancel") : undefined}
            onCancel={handleClose ? () => handleClose(false) : undefined}
            submitting={isSubmitting}
            submitLabel={tr("submit")}
          />
        </form>
      ) : null}
    </div>
  );
};
