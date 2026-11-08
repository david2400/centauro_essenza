/** @format */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useFieldArray, useForm, useWatch, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormSelectField } from "@repo/ui/form/scenes/form-select";
import { Buttons } from "@repo/ui/buttons/scenes";
import { HiOutlineShoppingCart, HiOutlineTrash, HiOutlineTruck, HiOutlineUser } from "react-icons/hi2";
import { SkuLookupField } from "@/components/async-combobox/lookup-fields";
import { ActionBar, SectionCard } from "@/components/form-sections";
import { notify } from "@/components/notifications";
import { formatMoney, formatNumber } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import { create_purchase_action, sku_options_action } from "@/server/domains/sales/purchases/actions";
import { CUSTOMER_DOC_TYPES, EDITABLE_CHANNELS } from "@/modules/ventas/order/constants";
import { OWN_SELLER, PURCHASES_HREF, type CreatePurchaseRequest, type ISkuOptions } from "../models/purchase.interface";
import { validationPurchase, type PurchaseFormValues } from "../schemas/purchase.schema";

const EMPTY_LINE = { sku_id: "", seller: "", quantity: "1" };

/**
 * Compra con productos de varios vendedores. Por cada producto se elige quién lo vende: la tienda
 * propia (precio del catálogo) o una oferta activa de un vendedor externo. draco crea un
 * subpedido por vendedor y vuelve a validar precios, disponibilidad y vendedores.
 */
export const PurchaseForm = () => {
  const t = useTranslations("Administre.purchase");
  const tf = useTranslations("Administre.purchase.form");
  const tOrder = useTranslations("Administre.order");
  const tCommon = useTranslations("Administre.common");
  const router = useRouter();
  const [options, setOptions] = useState<Record<string, ISkuOptions | "loading" | "error">>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { control, handleSubmit, setValue, setError, formState: { isSubmitting } } = useForm<PurchaseFormValues>({
    resolver: zodResolver(validationPurchase()),
    defaultValues: {
      channel: "BACKOFFICE", customer_doc_type: "CC", customer_doc_number: "", customer_name: "", customer_email: "",
      customer_phone: "", recipient_name: "", recipient_phone: "", address: "", city: "", shipping_amount: "0",
      lines: [EMPTY_LINE],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const lines = useWatch({ control, name: "lines" }) ?? [];
  const shipping = Number(useWatch({ control, name: "shipping_amount" }) || 0);

  const loadOptions = async (index: number, skuId: string) => {
    if (!skuId) return;
    setOptions((current) => ({ ...current, [skuId]: "loading" }));
    const result = await sku_options_action(Number(skuId));
    if (!result.success) {
      setOptions((current) => ({ ...current, [skuId]: "error" }));
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    setOptions((current) => ({ ...current, [skuId]: result.data }));
    const first = result.data.own_sellable ? OWN_SELLER : result.data.offers[0] ? String(result.data.offers[0].offer_id) : "";
    setValue(`lines.${index}.seller` as Path<PurchaseFormValues>, first, { shouldValidate: true });
  };

  const priceOf = (skuId: string, seller: string) => {
    const option = options[skuId];
    if (!option || typeof option === "string") return null;
    if (seller === OWN_SELLER) return option.own_price;
    return option.offers.find((offer) => String(offer.offer_id) === seller)?.price ?? null;
  };
  const sellerOf = (skuId: string, seller: string) => {
    const option = options[skuId];
    if (!option || typeof option === "string" || !seller) return null;
    if (seller === OWN_SELLER) return tf("ownStore");
    return option.offers.find((offer) => String(offer.offer_id) === seller)?.seller_name ?? null;
  };

  // Resumen estimado por vendedor (el precio definitivo lo congela draco al crear).
  const groups = new Map<string, number>();
  for (const line of lines) {
    const name = sellerOf(line.sku_id, line.seller);
    const price = priceOf(line.sku_id, line.seller);
    if (name == null || price == null) continue;
    groups.set(name, (groups.get(name) ?? 0) + price * Number(line.quantity || 0));
  }
  const itemsTotal = [...groups.values()].reduce((sum, value) => sum + value, 0);

  const submit = async (form: PurchaseFormValues) => {
    setSubmitError(null);
    const payload: CreatePurchaseRequest = {
      details: {
        channel: form.channel,
        customer: {
          kind: form.customer_doc_type === "NIT" ? "COMPANY" : "PERSON",
          doc_type: form.customer_doc_type || undefined,
          doc_number: form.customer_doc_number || undefined,
          name: form.customer_name,
          email: form.customer_email || undefined,
          phone: form.customer_phone || undefined,
        },
        delivery: {
          method: "SHIPPING",
          recipient_name: form.recipient_name,
          recipient_phone: form.recipient_phone || undefined,
          address: form.address,
          city: form.city,
          shipping_amount: Number(form.shipping_amount || 0),
        },
      },
      lines: form.lines.map((line) => ({
        sku_id: Number(line.sku_id),
        offer_id: line.seller === OWN_SELLER ? null : Number(line.seller),
        quantity: Number(line.quantity),
      })),
    };
    const result = await create_purchase_action(payload);
    if (!result.success) {
      setSubmitError(result.error);
      if (result.field_errors?.lines) setError("lines", { type: "server", message: result.field_errors.lines });
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    notify.success(tCommon("createdSuccess"), result.data.number);
    router.push(`${PURCHASES_HREF}/${result.data.id}`);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(submit)} className='grid gap-6' noValidate>
      <SectionCard id='purchase-customer' icon={HiOutlineUser} title={tf("customer")} hint={tf("customerHint")}>
        <FormSelectField controller={{ control, name: "customer_doc_type" }} label={tf("docType")}
          data={CUSTOMER_DOC_TYPES.map((value) => ({ value, label: value }))} triggerClassName='!w-full' className='col-span-12 md:col-span-2' />
        <FormField controller={{ control, name: "customer_doc_number" }} label={tf("docNumber")} className='col-span-12 md:col-span-3' />
        <FormField controller={{ control, name: "customer_name" }} label={tf("name")} required className='col-span-12 md:col-span-7' />
        <FormField controller={{ control, name: "customer_email" }} label={tf("email")} inputMode='email' className='col-span-12 md:col-span-5' />
        <FormField controller={{ control, name: "customer_phone" }} label={tf("phone")} inputMode='tel' className='col-span-12 md:col-span-4' />
        <FormSelectField controller={{ control, name: "channel" }} label={tf("channel")}
          data={EDITABLE_CHANNELS.map((value) => ({ value, label: tOrder(`channels.${value}` as never) }))} triggerClassName='!w-full'
          className='col-span-12 md:col-span-3' />
      </SectionCard>

      <SectionCard id='purchase-delivery' icon={HiOutlineTruck} title={tf("delivery")} hint={tf("deliveryHint")}>
        <FormField controller={{ control, name: "recipient_name" }} label={tf("recipient")} required className='col-span-12 md:col-span-6' />
        <FormField controller={{ control, name: "recipient_phone" }} label={tf("recipientPhone")} inputMode='tel' className='col-span-12 md:col-span-6' />
        <FormField controller={{ control, name: "address" }} label={tf("address")} required className='col-span-12 md:col-span-6' />
        <FormField controller={{ control, name: "city" }} label={tf("city")} required className='col-span-12 md:col-span-3' />
        <FormField controller={{ control, name: "shipping_amount" }} label={tf("shipping")} inputMode='decimal'
          description={tf("shippingHint")} className='col-span-12 md:col-span-3' />
      </SectionCard>

      <SectionCard id='purchase-lines' icon={HiOutlineShoppingCart} title={tf("lines")} hint={tf("linesHint")}
        actions={<Buttons type='button' size='sm' variant='outline' className='rounded-full' onClick={() => append(EMPTY_LINE)}>{tf("addLine")}</Buttons>}>
        {fields.map((field, index) => {
          const line = lines[index] ?? EMPTY_LINE;
          const option = options[line.sku_id];
          const ready = option && typeof option !== "string" ? option : null;
          const sellers = ready
            ? [
                ...(ready.own_sellable && ready.own_price != null
                  ? [{ value: OWN_SELLER, label: tf("ownOption", { price: formatMoney(ready.own_price) }) }]
                  : []),
                ...ready.offers.map((offer) => ({
                  value: String(offer.offer_id),
                  label: tf("offerOption", { seller: offer.seller_name, price: formatMoney(offer.price), available: formatNumber(offer.available_quantity) }),
                })),
              ]
            : [];
          const price = priceOf(line.sku_id, line.seller);
          return (
            <div key={field.id} className='col-span-12 grid grid-cols-12 items-end gap-3 rounded-xl border border-border p-3'>
              <SkuLookupField<PurchaseFormValues> control={control} name={`lines.${index}.sku_id` as Path<PurchaseFormValues>}
                label={tf("sku")} required sellableOnly className='col-span-12 md:col-span-5'
                onSelect={(selected) => void loadOptions(index, selected?.value ?? "")} />
              <FormSelectField controller={{ control, name: `lines.${index}.seller` as Path<PurchaseFormValues> }} label={tf("seller")}
                data={sellers} disabled={sellers.length === 0} triggerClassName='!w-full' className='col-span-12 md:col-span-4'
                description={option === "loading" ? tf("loadingSellers") : ready && sellers.length === 0 ? tf("noSellers") : undefined} />
              <FormField controller={{ control, name: `lines.${index}.quantity` as Path<PurchaseFormValues> }} label={tf("quantity")}
                inputMode='numeric' className='col-span-6 md:col-span-2' />
              <div className='col-span-6 flex items-center justify-end gap-2 md:col-span-1'>
                <span className='text-sm tabular-nums text-muted-foreground'>{price != null ? formatMoney(price * Number(line.quantity || 0)) : ""}</span>
                <Buttons type='button' size='sm' variant='outline' className='rounded-full' disabled={fields.length === 1}
                  onClick={() => remove(index)} aria-label={tf("removeLine")}>
                  <HiOutlineTrash className='h-4 w-4' aria-hidden='true' />
                </Buttons>
              </div>
            </div>
          );
        })}
        <div className='col-span-12 grid gap-1 rounded-xl bg-muted/30 p-3 text-sm'>
          <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>{tf("summary")}</p>
          {[...groups.entries()].map(([name, value]) => (
            <div key={name} className='flex justify-between gap-3'>
              <span>{tf("subOrderFor", { seller: name })}</span>
              <span className='tabular-nums'>{formatMoney(value)}</span>
            </div>
          ))}
          <div className='flex justify-between gap-3'>
            <span>{tf("shipping")}</span>
            <span className='tabular-nums'>{formatMoney(shipping)}</span>
          </div>
          <div className='flex justify-between gap-3 border-t border-border pt-1 font-semibold'>
            <span>{t("fields.total")}</span>
            <span className='tabular-nums'>{formatMoney(itemsTotal + shipping)}</span>
          </div>
          <p className='text-xs text-muted-foreground'>{tf("summaryNote")}</p>
        </div>
      </SectionCard>

      <ActionBar message={submitError ?? tf("notice")}>
        <Link href={PURCHASES_HREF}
          className='inline-flex h-10 items-center rounded-full border border-border px-4 text-sm font-medium hover:bg-muted'>
          {tCommon("cancel")}
        </Link>
        <Buttons type='submit' className='rounded-full' loading={isSubmitting}>{t("create")}</Buttons>
      </ActionBar>
    </form>
  );
};
