/** @format */

"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm, useWatch, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormSelectField } from "@repo/ui/form/scenes/form-select";
import { Buttons } from "@repo/ui/buttons/scenes";
import { HiOutlineCube, HiOutlineTag } from "react-icons/hi2";
import { FormAsyncCombobox } from "@/components/async-combobox/form-async-combobox";
import type { ComboOption } from "@/components/async-combobox/async-combobox";
import { SkuLookupField } from "@/components/async-combobox/lookup-fields";
import { ActionBar, SectionCard } from "@/components/form-sections";
import { notify } from "@/components/notifications";
import { Link } from "@/shared/i18n/routing";
import { create_offer_action, lookup_sellers_action, update_offer_action } from "@/server/domains/marketplace/actions";
import type { SaveOfferRequest } from "@/server/domains/marketplace/types";
import { OFFER_CONDITIONS, OFFERS_HREF, PLAN_CURRENCIES, pick, type IOfferDetail, type ISellerOption } from "../models/marketplace.interface";
import { validationOffer, type OfferFormValues } from "../schemas/marketplace.schema";

const toValues = (offer?: IOfferDetail | null, sellerId?: number | null): OfferFormValues => ({
  seller_id: offer ? String(offer.seller_id) : sellerId ? String(sellerId) : "",
  sku_id: offer ? String(offer.sku.sku_id) : "",
  currency: offer?.currency ?? "COP",
  price: offer ? String(offer.price) : "",
  available_quantity: offer ? String(offer.available_quantity) : "0",
  handling_days: offer ? String(offer.handling_days) : "1",
  condition: pick(OFFER_CONDITIONS, offer?.condition, "NEW"),
  fulfillment: offer?.fulfillment === "PLATFORM" ? "PLATFORM" : "SELLER",
  seller_sku: offer?.seller_sku ?? "",
});

/**
 * Oferta de un vendedor externo sobre un SKU del catálogo. Vendedor y SKU se eligen solo al
 * crear; en una oferta publicada solo se cambian precio, cantidad y alistamiento.
 */
export const OfferForm = ({ offer, sellerId, sellerName }: { offer?: IOfferDetail | null; sellerId?: number | null; sellerName?: string | null }) => {
  const t = useTranslations("Administre.marketplace.offer");
  const tf = useTranslations("Administre.marketplace.offer.form");
  const tConditions = useTranslations("Administre.marketplace.offer.conditions");
  const tCommon = useTranslations("Administre.common");
  const router = useRouter();
  const isNew = offer?.id == null;
  const editable = new Set(isNew ? ["price", "available_quantity", "handling_days", "condition", "seller_sku", "currency", "fulfillment"] : offer!.editable_fields);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { control, handleSubmit, setError, formState: { isSubmitting, isDirty } } = useForm<OfferFormValues>({
    resolver: zodResolver(validationOffer(isNew)),
    defaultValues: toValues(offer, sellerId),
  });
  const values = useWatch({ control }) as OfferFormValues;

  const searchSellers = useCallback(async (q: string): Promise<ComboOption<ISellerOption>[]> => {
    const result = await lookup_sellers_action(q, "EXTERNAL");
    if (!result.success) throw new Error(result.error);
    return result.data.map((seller) => ({
      value: String(seller.id),
      label: seller.name,
      hint: [seller.code, seller.status].filter(Boolean).join(" · "),
      data: seller,
    }));
  }, []);

  const submit = async (form: OfferFormValues) => {
    setSubmitError(null);
    const payload: SaveOfferRequest = {
      seller_id: isNew ? Number(form.seller_id) : undefined,
      sku_id: isNew ? Number(form.sku_id) : undefined,
      currency: form.currency,
      price: Number(form.price),
      available_quantity: Number(form.available_quantity || 0),
      handling_days: Number(form.handling_days || 0),
      condition: form.condition,
      fulfillment: form.fulfillment,
      seller_sku: form.seller_sku.trim() || undefined,
      lock_version: offer?.lock_version,
    };
    const result = isNew ? await create_offer_action(payload) : await update_offer_action(offer!.id, payload);
    if (!result.success) {
      for (const [field, message] of Object.entries(result.field_errors ?? {})) {
        setError(field as Path<OfferFormValues>, { type: "server", message });
      }
      setSubmitError(result.error);
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    notify.success(isNew ? tCommon("createdSuccess") : tCommon("updatedSuccess"), result.data.sku.name ?? `#${result.data.id}`);
    router.push(`${OFFERS_HREF}/${result.data.id}`);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(submit)} className='grid gap-6' noValidate>
      <SectionCard id='offer-what' icon={HiOutlineCube} title={tf("what")} hint={isNew ? tf("whatHint") : tf("whatLocked")}>
        {isNew ? (
          <>
            <FormAsyncCombobox<OfferFormValues, ISellerOption> control={control} name='seller_id' label={t("fields.seller")} required
              search={searchSellers} minChars={0} placeholder={tf("sellerPlaceholder")}
              initialOption={sellerId && sellerName ? { value: String(sellerId), label: sellerName } : null}
              description={tf("sellerHint")} className='col-span-12 md:col-span-6' />
            <SkuLookupField<OfferFormValues> control={control} name='sku_id' label={t("fields.sku")} required
              description={tf("skuHint")} className='col-span-12 md:col-span-6' />
          </>
        ) : (
          <dl className='col-span-12 grid gap-2 text-sm sm:grid-cols-2'>
            <div><dt className='text-muted-foreground'>{t("fields.seller")}</dt><dd className='font-medium'>{offer!.seller_name}</dd></div>
            <div><dt className='text-muted-foreground'>{t("fields.sku")}</dt><dd className='font-medium'>{[offer!.sku.name, offer!.sku.code].filter(Boolean).join(" · ")}</dd></div>
          </dl>
        )}
      </SectionCard>

      <SectionCard id='offer-terms' icon={HiOutlineTag} title={tf("terms")} hint={isNew || editable.has("condition") ? tf("termsHint") : tf("termsLive")}>
        <FormSelectField controller={{ control, name: "currency" }} label={t("fields.currency")} disabled={!editable.has("currency")}
          data={PLAN_CURRENCIES.map((value) => ({ value, label: value }))} triggerClassName='!w-full' className='col-span-12 md:col-span-3' />
        <FormField controller={{ control, name: "price" }} label={t("fields.price")} inputMode='decimal' required disabled={!editable.has("price")}
          description={tf("priceHint", { currency: values.currency || "COP" })} className='col-span-12 md:col-span-5' />
        <FormSelectField controller={{ control, name: "fulfillment" }} label={t("fields.fulfillment")} disabled={!editable.has("fulfillment")}
          data={["SELLER", "PLATFORM"].map((value) => ({ value, label: tf(`fulfillments.${value}` as never) }))} triggerClassName='!w-full'
          className='col-span-12 md:col-span-4' />
        <FormField controller={{ control, name: "available_quantity" }} label={t("fields.quantity")} inputMode='numeric'
          disabled={!editable.has("available_quantity") || values.fulfillment === "PLATFORM"}
          description={values.fulfillment === "PLATFORM" ? tf("quantityPlatform") : tf("quantityHint")} className='col-span-12 md:col-span-4' />
        <FormField controller={{ control, name: "handling_days" }} label={t("fields.handlingDays")} inputMode='numeric'
          disabled={!editable.has("handling_days")} className='col-span-12 md:col-span-4' />
        <FormSelectField controller={{ control, name: "condition" }} label={t("fields.condition")} disabled={!editable.has("condition")}
          data={OFFER_CONDITIONS.map((value) => ({ value, label: tConditions(value) }))} triggerClassName='!w-full' className='col-span-12 md:col-span-4' />
        <FormField controller={{ control, name: "seller_sku" }} label={t("fields.sellerSku")} disabled={!editable.has("seller_sku")}
          className='col-span-12 md:col-span-4' />
        <p className='col-span-12 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground'>{tf("fulfillmentNote")}</p>
      </SectionCard>

      <ActionBar message={submitError ?? (isDirty ? tf("unsaved") : isNew ? tf("draftNotice") : undefined)}>
        <Link href={isNew ? OFFERS_HREF : `${OFFERS_HREF}/${offer!.id}`}
          className='inline-flex h-10 items-center rounded-full border border-border px-4 text-sm font-medium hover:bg-muted'>
          {tCommon("cancel")}
        </Link>
        <Buttons type='submit' className='rounded-full' loading={isSubmitting}>{isNew ? t("create") : tCommon("save")}</Buttons>
      </ActionBar>
    </form>
  );
};
