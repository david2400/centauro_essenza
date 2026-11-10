/** @format */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal } from "@repo/ui/modals/scenes/dialog/modal";
import { Buttons } from "@repo/ui/buttons/scenes";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormSelectField } from "@repo/ui/form/scenes/form-select";
import { HiOutlineDocumentCheck, HiOutlineUser, HiOutlineUserGroup } from "react-icons/hi2";
import { ChoiceCard } from "@/components/form-sections";
import { notify } from "@/components/notifications";
import { formatMoney } from "@/lib/format";
import { BUYER_DOC_TYPES, type IInvoice } from "../models/invoice.interface";
import { nitCheckDigit, validationBuyer, type BuyerFormValues } from "../schemas/buyer.schema";
import { issueInvoiceServerAction } from "@/app/[locale]/facturacion/invoices/actions";

const EMPTY: BuyerFormValues = {
  final_consumer: true,
  doc_type: "CC",
  doc_number: "",
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
};

/**
 * Emite la factura electrónica de una orden pagada: consumidor final o comprador con
 * documento (el DV del NIT se calcula al escribir). Al emitir se numera con la resolución
 * activa y se envía al proveedor; el resultado (CUFE o motivo del rechazo) se notifica.
 */
export const IssueInvoiceDialog = ({
  open,
  onClose,
  orderId,
  total,
  onIssued,
}: {
  open: boolean;
  onClose: () => void;
  orderId: number;
  total?: number;
  onIssued?: (invoice: IInvoice) => void;
}) => {
  const t = useTranslations("Administre.billing.invoice");
  const ti = useTranslations("Administre.billing.invoice.issue");
  const tCommon = useTranslations("Administre.common");
  const router = useRouter();
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting },
  } = useForm<BuyerFormValues>({ resolver: zodResolver(validationBuyer()), defaultValues: EMPTY });
  const values = useWatch({ control }) as BuyerFormValues;

  useEffect(() => {
    if (open) reset(EMPTY);
  }, [open, reset]);

  const submit = async (form: BuyerFormValues) => {
    const result = await issueInvoiceServerAction({
      order_id: orderId,
      buyer: form.final_consumer
        ? undefined
        : {
            doc_type: form.doc_type,
            doc_number: form.doc_number,
            name: form.name,
            email: form.email || undefined,
            phone: form.phone || undefined,
            address: form.address || undefined,
            city: form.city || undefined,
          },
    });
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    const invoice = result.data;
    if (invoice.status === "ISSUED") notify.success(ti("issued", { number: invoice.full_number ?? "" }));
    else notify.warning(ti("notIssued", { number: invoice.full_number ?? "" }), invoice.status_detail ?? undefined);
    router.refresh();
    onIssued?.(invoice);
    onClose();
  };

  const dv = values.doc_type === "NIT" ? nitCheckDigit(values.doc_number ?? "") : "";

  return (
    <Modal
      size='lg'
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
      title={ti("title", { order: orderId })}
      description={total != null ? ti("subtitle", { total: formatMoney(total) }) : undefined}
      hideDefaultFooter>
      <form onSubmit={handleSubmit(submit)} className='grid gap-5'>
        <div role='radiogroup' aria-label={ti("buyer")} className='grid gap-3 sm:grid-cols-2'>
          <ChoiceCard
            name='invoice-buyer'
            value='final'
            icon={HiOutlineUserGroup}
            title={ti("finalConsumer")}
            description={ti("finalConsumerHint")}
            selected={values.final_consumer}
            onSelect={() => setValue("final_consumer", true)}
          />
          <ChoiceCard
            name='invoice-buyer'
            value='buyer'
            icon={HiOutlineUser}
            title={ti("withData")}
            description={ti("withDataHint")}
            selected={!values.final_consumer}
            onSelect={() => setValue("final_consumer", false)}
          />
        </div>

        {!values.final_consumer ? (
          <div className='grid grid-cols-12 gap-4 rounded-xl border border-border p-4'>
            <FormSelectField
              controller={{ control, name: "doc_type" }}
              label={t("fields.docType")}
              data={BUYER_DOC_TYPES.map((type) => ({ value: type, label: t(`docTypes.${type}`) }))}
              triggerClassName='!w-full'
              className='col-span-12 sm:col-span-4'
            />
            <FormField
              controller={{ control, name: "doc_number" }}
              label={t("fields.docNumber")}
              required
              // Con NIT el sufijo se reserva desde antes de escribir: si aparece con la primera tecla,
              // FormField cambia de Input a InputGroup y el campo pierde el foco.
              suffix={values.doc_type === "NIT" ? <span className='tabular-nums'>DV {dv || "–"}</span> : undefined}
              className='col-span-12 sm:col-span-8'
            />
            <FormField
              controller={{ control, name: "name" }}
              label={values.doc_type === "NIT" ? t("fields.legalName") : t("fields.buyerName")}
              required
              className='col-span-12'
            />
            <FormField
              controller={{ control, name: "email" }}
              type='email'
              label={t("fields.email")}
              description={ti("emailHint")}
              className='col-span-12 sm:col-span-6'
            />
            <FormField controller={{ control, name: "phone" }} label={t("fields.phone")} className='col-span-12 sm:col-span-6' />
            <FormField controller={{ control, name: "address" }} label={t("fields.address")} className='col-span-12 sm:col-span-8' />
            <FormField controller={{ control, name: "city" }} label={t("fields.city")} className='col-span-12 sm:col-span-4' />
          </div>
        ) : (
          <p className='rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground'>{ti("finalConsumerNote")}</p>
        )}

        <div className='flex justify-end gap-2'>
          <Buttons type='button' variant='outline' className='rounded-full' onClick={onClose}>
            {tCommon("cancel")}
          </Buttons>
          <Buttons type='submit' loading={isSubmitting} className='rounded-full'>
            <HiOutlineDocumentCheck className='h-4 w-4' aria-hidden='true' />
            {ti("submit")}
          </Buttons>
        </div>
      </form>
    </Modal>
  );
};
