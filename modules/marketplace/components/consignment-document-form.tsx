/** @format */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useFieldArray, useForm, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormSelectField } from "@repo/ui/form/scenes/form-select";
import { FormTextAreaField } from "@repo/ui/form/scenes/form-area";
import { Buttons } from "@repo/ui/buttons/scenes";
import { HiOutlineArchiveBox, HiOutlinePlusCircle, HiOutlineTrash, HiOutlineTruck } from "react-icons/hi2";
import { SkuLookupField } from "@/components/async-combobox/lookup-fields";
import { ActionBar, SectionCard } from "@/components/form-sections";
import { notify } from "@/components/notifications";
import { Link } from "@/shared/i18n/routing";
import { save_consignment_document_action } from "@/server/domains/marketplace/consignment/actions";
import { CONSIGNMENT_DOCUMENTS_HREF, CONSIGNMENT_HREF, type IConsignmentOptions } from "../models/consignment.interface";
import { validationConsignmentDocument, type ConsignmentDocumentValues } from "../schemas/consignment.schema";

interface IConsignmentDocumentFormProps {
  kind: "RECEIPT" | "RETURN_TO_SELLER";
  options: IConsignmentOptions;
  sellerId?: number | null;
}

/**
 * Recepción de mercancía del vendedor en una bodega propia, o devolución al vendedor. Cada SKU
 * suma o resta a su saldo de consignación y al disponible de su oferta con despacho de la
 * plataforma.
 */
export const ConsignmentDocumentForm = ({ kind, options, sellerId }: IConsignmentDocumentFormProps) => {
  const t = useTranslations("Administre.marketplace.consignment");
  const tf = useTranslations("Administre.marketplace.consignment.form");
  const tCommon = useTranslations("Administre.common");
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const receipt = kind === "RECEIPT";

  const { control, handleSubmit, setError, formState: { isSubmitting, errors } } = useForm<ConsignmentDocumentValues>({
    resolver: zodResolver(validationConsignmentDocument()),
    defaultValues: {
      seller_id: sellerId ? String(sellerId) : "",
      warehouse_id: options.warehouses.length === 1 ? String(options.warehouses[0].id) : "",
      reference: "",
      notes: "",
      lines: [{ sku_id: "", quantity: "1" }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  const submit = async (form: ConsignmentDocumentValues) => {
    setSubmitError(null);
    const result = await save_consignment_document_action({
      kind,
      seller_id: Number(form.seller_id),
      warehouse_id: Number(form.warehouse_id),
      reference: form.reference || null,
      notes: form.notes || null,
      lines: form.lines.map((line) => ({ sku_id: Number(line.sku_id), quantity: Number(line.quantity) })),
    });
    if (!result.success) {
      for (const [field, message] of Object.entries(result.field_errors ?? {})) {
        setError(field as Path<ConsignmentDocumentValues>, { type: "server", message });
      }
      setSubmitError(result.error);
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    notify.success(receipt ? tf("receivedDone") : tf("returnedDone"), result.data.number ?? "");
    router.push(`${CONSIGNMENT_DOCUMENTS_HREF}/${result.data.id}`);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(submit)} className='grid gap-6' noValidate>
      <SectionCard id='consignment-header' icon={receipt ? HiOutlineArchiveBox : HiOutlineTruck}
        title={receipt ? tf("receiptTitle") : tf("returnTitle")} hint={receipt ? tf("receiptHint") : tf("returnHint")}>
        <FormSelectField controller={{ control, name: "seller_id" }} label={t("fields.seller")} required triggerClassName='!w-full'
          data={options.sellers.map((s) => ({ value: String(s.id), label: s.name }))} className='col-span-12 md:col-span-6' />
        <FormSelectField controller={{ control, name: "warehouse_id" }} label={t("fields.warehouse")} required triggerClassName='!w-full'
          data={options.warehouses.map((w) => ({ value: String(w.id), label: w.name }))} className='col-span-12 md:col-span-6' />
        <FormField controller={{ control, name: "reference" }} label={tf("reference")} description={tf("referenceHint")}
          className='col-span-12 md:col-span-6' />
        <FormTextAreaField controller={{ control, name: "notes" }} label={tf("notes")} className='col-span-12 md:col-span-6' />
      </SectionCard>

      <SectionCard id='consignment-lines' icon={HiOutlineArchiveBox} title={tf("lines", { count: fields.length })} hint={tf("linesHint")}>
        {fields.map((field, index) => (
          <div key={field.id} className='col-span-12 grid grid-cols-12 items-end gap-3'>
            <SkuLookupField<ConsignmentDocumentValues> control={control} name={`lines.${index}.sku_id`} label={t("fields.sku")}
              required className='col-span-12 md:col-span-8' />
            <FormField controller={{ control, name: `lines.${index}.quantity` }} label={tf("quantity")} inputMode='numeric'
              required className='col-span-9 md:col-span-3' />
            <Buttons type='button' variant='outline' className='col-span-3 rounded-full md:col-span-1' disabled={fields.length === 1}
              onClick={() => remove(index)} aria-label={tf("removeLine")}>
              <HiOutlineTrash className='h-4 w-4' aria-hidden='true' />
            </Buttons>
          </div>
        ))}
        {errors.lines?.message ? <p className='col-span-12 text-sm text-destructive'>{errors.lines.message}</p> : null}
        <div className='col-span-12'>
          <Buttons type='button' variant='outline' className='rounded-full' disabled={fields.length >= 200}
            onClick={() => append({ sku_id: "", quantity: "1" })}>
            <HiOutlinePlusCircle className='h-4 w-4' aria-hidden='true' />
            {tf("addLine")}
          </Buttons>
        </div>
      </SectionCard>

      <ActionBar message={submitError ?? undefined}>
        <Link href={CONSIGNMENT_HREF}
          className='inline-flex h-10 items-center rounded-full border border-border px-4 text-sm font-medium hover:bg-muted'>
          {tCommon("cancel")}
        </Link>
        <Buttons type='submit' className='rounded-full' loading={isSubmitting}>{receipt ? t("receive") : t("returnToSeller")}</Buttons>
      </ActionBar>
    </form>
  );
};
