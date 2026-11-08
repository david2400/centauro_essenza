/** @format */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormSelectField } from "@repo/ui/form/scenes/form-select";
import { FormTextAreaField } from "@repo/ui/form/scenes/form-area";
import { Buttons } from "@repo/ui/buttons/scenes";
import { HiOutlineIdentification, HiOutlineShieldCheck } from "react-icons/hi2";
import { ActionBar, SectionCard } from "@/components/form-sections";
import { notify } from "@/components/notifications";
import { formatApiDate } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import { create_customer_action, update_customer_action } from "@/server/domains/sales/customers/actions";
import { CUSTOMER_DOC_TYPES } from "@/modules/ventas/order/constants";
import { CUSTOMERS_HREF, type ICustomerDetail, type SaveCustomerRequest } from "../models/customer.interface";
import { validationCustomer, type CustomerFormValues } from "../schemas/customer.schema";

const toValues = (customer?: ICustomerDetail | null): CustomerFormValues => ({
  kind: customer?.kind === "COMPANY" ? "COMPANY" : "PERSON",
  doc_type: customer?.doc_type ?? "CC",
  doc_number: customer?.doc_number ?? "",
  name: customer?.name ?? "",
  email: customer?.email ?? "",
  phone: customer?.phone ?? "",
  billing_address: customer?.billing_address ?? "",
  billing_city: customer?.billing_city ?? "",
  marketing_consent: customer?.marketing_consent ?? false,
  notes: customer?.notes ?? "",
});

/** Alta y edición del cliente. El documento es su identificación en la tienda (único por empresa). */
export const CustomerForm = ({ customer }: { customer?: ICustomerDetail | null }) => {
  const t = useTranslations("Administre.customer");
  const tf = useTranslations("Administre.customer.form");
  const tCommon = useTranslations("Administre.common");
  const router = useRouter();
  const isNew = customer == null;
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { control, register, handleSubmit, setError, formState: { isSubmitting, isDirty } } = useForm<CustomerFormValues>({
    resolver: zodResolver(validationCustomer()),
    defaultValues: toValues(customer),
  });

  const submit = async (form: CustomerFormValues) => {
    setSubmitError(null);
    const payload: SaveCustomerRequest = {
      kind: form.kind,
      doc_type: form.doc_type,
      doc_number: form.doc_number,
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      billing_address: form.billing_address || null,
      billing_city: form.billing_city || null,
      store_user_id: customer?.store_user_id ?? null,
      marketing_consent: form.marketing_consent,
      notes: form.notes || null,
      lock_version: customer?.lock_version ?? null,
    };
    const result = isNew ? await create_customer_action(payload) : await update_customer_action(customer.id, payload);
    if (!result.success) {
      for (const [field, message] of Object.entries(result.field_errors ?? {})) {
        setError(field as Path<CustomerFormValues>, { type: "server", message });
      }
      setSubmitError(result.error);
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    notify.success(isNew ? tCommon("createdSuccess") : tCommon("updatedSuccess"), result.data.name);
    router.push(`${CUSTOMERS_HREF}/${result.data.id}`);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(submit)} className='grid gap-6' noValidate>
      <SectionCard id='customer-identity' icon={HiOutlineIdentification} title={tf("identity")} hint={tf("identityHint")}>
        <FormSelectField controller={{ control, name: "kind" }} label={t("fields.kind")}
          data={[{ value: "PERSON", label: tf("person") }, { value: "COMPANY", label: tf("company") }]} triggerClassName='!w-full'
          className='col-span-12 md:col-span-3' />
        <FormSelectField controller={{ control, name: "doc_type" }} label={t("fields.docType")}
          data={CUSTOMER_DOC_TYPES.map((value) => ({ value, label: value }))} triggerClassName='!w-full' className='col-span-12 md:col-span-2' />
        <FormField controller={{ control, name: "doc_number" }} label={t("fields.docNumber")} required className='col-span-12 md:col-span-3' />
        <FormField controller={{ control, name: "name" }} label={t("fields.name")} required className='col-span-12 md:col-span-4' />
        <FormField controller={{ control, name: "email" }} label={t("fields.email")} inputMode='email' className='col-span-12 md:col-span-4' />
        <FormField controller={{ control, name: "phone" }} label={t("fields.phone")} inputMode='tel' className='col-span-12 md:col-span-4' />
        <FormField controller={{ control, name: "billing_city" }} label={t("fields.city")} className='col-span-12 md:col-span-4' />
        <FormField controller={{ control, name: "billing_address" }} label={t("fields.address")} className='col-span-12' />
      </SectionCard>

      <SectionCard id='customer-consent' icon={HiOutlineShieldCheck} title={tf("consent")} hint={tf("consentHint")}>
        <label className='col-span-12 flex items-start gap-3 text-sm'>
          <input type='checkbox' className='mt-1 h-4 w-4' {...register("marketing_consent")} />
          <span>
            {tf("consentLabel")}
            {customer?.consent_at ? (
              <span className='block text-xs text-muted-foreground'>{tf("consentSince", { date: formatApiDate(customer.consent_at) })}</span>
            ) : null}
          </span>
        </label>
        <FormTextAreaField controller={{ control, name: "notes" }} label={t("fields.notes")} className='col-span-12' />
      </SectionCard>

      <ActionBar message={submitError ?? (isDirty ? tf("unsaved") : undefined)}>
        <Link href={isNew ? CUSTOMERS_HREF : `${CUSTOMERS_HREF}/${customer.id}`}
          className='inline-flex h-10 items-center rounded-full border border-border px-4 text-sm font-medium hover:bg-muted'>
          {tCommon("cancel")}
        </Link>
        <Buttons type='submit' className='rounded-full' loading={isSubmitting}>{isNew ? t("create") : tCommon("save")}</Buttons>
      </ActionBar>
    </form>
  );
};
