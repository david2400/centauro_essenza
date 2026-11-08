/** @format */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useFieldArray, useForm, useWatch, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormTextAreaField } from "@repo/ui/form/scenes/form-area";
import { FormSelectField } from "@repo/ui/form/scenes/form-select";
import { Buttons } from "@repo/ui/buttons/scenes";
import {
  HiOutlineIdentification,
  HiOutlineMapPin,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineUserCircle,
  HiOutlineUserGroup,
} from "react-icons/hi2";
import { ActionBar, EmptyBlock, SectionCard, Segmented } from "@/components/form-sections";
import { notify } from "@/components/notifications";
import { cn } from "@/lib/utils";
import { Link } from "@/shared/i18n/routing";
import { create_seller_action, update_seller_action } from "@/server/domains/marketplace/actions";
import type { SaveSellerRequest } from "@/server/domains/marketplace/types";
import { SELLER_DOC_TYPES, SELLERS_HREF, type ISellerDetail } from "../models/marketplace.interface";
import { validationSeller, type SellerFormValues } from "../schemas/marketplace.schema";

const text = (value: string) => value.trim() || undefined;

const toValues = (seller?: ISellerDetail | null): SellerFormValues => ({
  code: seller?.code ?? "",
  kind: seller?.kind === "OWN" ? "OWN" : "EXTERNAL",
  legal_name: seller?.legal_name ?? "",
  trade_name: seller?.trade_name ?? "",
  doc_type: seller?.doc_type ?? "NIT",
  doc_number: seller?.doc_number ?? "",
  email: seller?.email ?? "",
  phone: seller?.phone ?? "",
  website: seller?.website ?? "",
  address: seller?.address ?? "",
  city: seller?.city ?? "",
  description: seller?.description ?? "",
  account_manager_name: seller?.account_manager_name ?? "",
  contacts: (seller?.contacts ?? []).map((contact) => ({
    name: contact.name ?? "",
    role: contact.role ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    primary: Boolean(contact.primary),
  })),
});

/**
 * Ficha comercial del vendedor (alta y edición). No pide datos bancarios ni credenciales de
 * pasarela: el cobro directo al vendedor se integrará con la pasarela que se elija.
 */
export const SellerForm = ({ seller }: { seller?: ISellerDetail | null }) => {
  const t = useTranslations("Administre.marketplace.seller");
  const tf = useTranslations("Administre.marketplace.seller.form");
  const tKinds = useTranslations("Administre.marketplace.seller.kinds");
  const tCommon = useTranslations("Administre.common");
  const router = useRouter();
  const isNew = seller?.id == null;
  const kindLocked = !isNew && seller?.status !== "DRAFT";
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { isSubmitting, isDirty, errors },
  } = useForm<SellerFormValues>({ resolver: zodResolver(validationSeller()), defaultValues: toValues(seller) });
  const values = useWatch({ control }) as SellerFormValues;
  const contacts = useFieldArray({ control, name: "contacts" });

  const submit = async (form: SellerFormValues) => {
    setSubmitError(null);
    const payload: SaveSellerRequest = {
      code: isNew ? text(form.code)?.toUpperCase() : undefined,
      kind: form.kind,
      legal_name: form.legal_name.trim(),
      trade_name: text(form.trade_name),
      doc_type: form.doc_type,
      doc_number: form.doc_number.trim(),
      email: text(form.email),
      phone: text(form.phone),
      website: text(form.website),
      address: text(form.address),
      city: text(form.city),
      description: text(form.description),
      account_manager_name: text(form.account_manager_name),
      contacts: form.contacts.map((contact) => ({
        name: contact.name.trim(),
        role: text(contact.role) ?? null,
        email: text(contact.email) ?? null,
        phone: text(contact.phone) ?? null,
        primary: contact.primary,
      })),
      version: seller?.version,
    };
    const result = isNew ? await create_seller_action(payload) : await update_seller_action(seller!.id, payload);
    if (!result.success) {
      for (const [field, message] of Object.entries(result.field_errors ?? {})) {
        setError(field as Path<SellerFormValues>, { type: "server", message });
      }
      setSubmitError(result.error);
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    notify.success(isNew ? tCommon("createdSuccess") : tCommon("updatedSuccess"), result.data.trade_name ?? result.data.legal_name);
    router.push(`${SELLERS_HREF}/${result.data.id}`);
    router.refresh();
  };

  const setPrimary = (index: number) => {
    (values.contacts ?? []).forEach((_, position) =>
      setValue(`contacts.${position}.primary`, position === index, { shouldDirty: true }));
  };

  return (
    <form onSubmit={handleSubmit(submit)} className='grid gap-6' noValidate>
      <SectionCard id='seller-identity' icon={HiOutlineIdentification} title={tf("identity")} hint={tf("identityHint")}>
        <div className='col-span-12 grid gap-1.5'>
          <span className='text-sm font-medium text-foreground'>{t("fields.kind")}</span>
          <Segmented label={t("fields.kind")} value={values.kind ?? "EXTERNAL"}
            options={[
              { value: "EXTERNAL", label: tKinds("EXTERNAL") },
              { value: "OWN", label: tKinds("OWN") },
            ]}
            onChange={(kind) => !kindLocked && setValue("kind", kind, { shouldDirty: true })} />
          <p className='text-xs text-muted-foreground'>{kindLocked ? tf("kindLocked") : values.kind === "OWN" ? tf("ownHint") : tf("externalHint")}</p>
        </div>
        <FormSelectField controller={{ control, name: "doc_type" }} label={t("fields.docType")} required
          data={SELLER_DOC_TYPES.map((type) => ({ value: type, label: tf(`docTypes.${type}`) }))}
          triggerClassName='!w-full' className='col-span-12 md:col-span-4' />
        <FormField controller={{ control, name: "doc_number" }} label={t("fields.docNumber")} required
          description={tf("docNumberHint")} className='col-span-12 md:col-span-8' />
        <FormField controller={{ control, name: "legal_name" }} label={t("fields.legalName")} required className='col-span-12 md:col-span-7' />
        <FormField controller={{ control, name: "trade_name" }} label={t("fields.tradeName")} className='col-span-12 md:col-span-5' />
        <FormField controller={{ control, name: "code" }} label={t("fields.code")} disabled={!isNew}
          description={isNew ? tf("codeHint") : tf("codeLocked")} placeholder={isNew ? "VEN-…" : undefined}
          className='col-span-12 md:col-span-5' />
        <FormTextAreaField controller={{ control, name: "description" }} label={t("fields.description")} rows={3} className='col-span-12' />
      </SectionCard>

      <SectionCard id='seller-contact' icon={HiOutlineMapPin} title={tf("contact")} hint={tf("contactHint")}>
        <FormField controller={{ control, name: "email" }} type='email' label={t("fields.email")} className='col-span-12 md:col-span-5' />
        <FormField controller={{ control, name: "phone" }} type='tel' label={t("fields.phone")} className='col-span-12 md:col-span-3' />
        <FormField controller={{ control, name: "website" }} label={t("fields.website")} className='col-span-12 md:col-span-4' />
        <FormField controller={{ control, name: "address" }} label={t("fields.address")} className='col-span-12 md:col-span-8' />
        <FormField controller={{ control, name: "city" }} label={t("fields.city")} className='col-span-12 md:col-span-4' />
      </SectionCard>

      <SectionCard id='seller-people' icon={HiOutlineUserGroup} title={tf("people")} hint={tf("peopleHint")}>
        {contacts.fields.length === 0 ? (
          <EmptyBlock icon={HiOutlineUserGroup} title={tf("noContacts")} description={tf("noContactsHint")}
            action={
              <Buttons type='button' variant='outline' className='rounded-full'
                onClick={() => contacts.append({ name: "", role: "", email: "", phone: "", primary: true })}>
                <HiOutlinePlus className='h-4 w-4' aria-hidden='true' />
                {tf("addContact")}
              </Buttons>
            } />
        ) : (
          <div className='col-span-12 grid gap-3'>
            {contacts.fields.map((field, index) => {
              const isPrimary = Boolean(values.contacts?.[index]?.primary);
              return (
                <fieldset key={field.id}
                  className={cn("grid grid-cols-12 gap-3 rounded-xl border p-3", isPrimary ? "border-primary/50 bg-primary/5" : "border-border")}>
                  <legend className='sr-only'>{tf("contactN", { n: index + 1 })}</legend>
                  <FormField controller={{ control, name: `contacts.${index}.name` }} label={t("fields.contactName")} required className='col-span-12 md:col-span-4' />
                  <FormField controller={{ control, name: `contacts.${index}.role` }} label={t("fields.contactRole")} className='col-span-12 md:col-span-3' />
                  <FormField controller={{ control, name: `contacts.${index}.email` }} type='email' label={t("fields.email")} className='col-span-12 md:col-span-3' />
                  <FormField controller={{ control, name: `contacts.${index}.phone` }} type='tel' label={t("fields.phone")} className='col-span-12 md:col-span-2' />
                  <div className='col-span-12 flex flex-wrap items-center justify-between gap-2'>
                    <label className='inline-flex items-center gap-2 text-sm'>
                      <input type='radio' name='seller-primary-contact' checked={isPrimary} onChange={() => setPrimary(index)} />
                      {tf("primaryContact")}
                    </label>
                    <Buttons type='button' variant='ghost' size='sm' className='rounded-full text-destructive' onClick={() => contacts.remove(index)}>
                      <HiOutlineTrash className='h-4 w-4' aria-hidden='true' />
                      {tf("removeContact")}
                    </Buttons>
                  </div>
                </fieldset>
              );
            })}
            {errors.contacts?.root?.message || errors.contacts?.message ? (
              <p className='text-xs text-destructive'>{errors.contacts?.root?.message ?? errors.contacts?.message}</p>
            ) : null}
            <div>
              <Buttons type='button' variant='outline' size='sm' className='rounded-full'
                onClick={() => contacts.append({ name: "", role: "", email: "", phone: "", primary: false })}>
                <HiOutlinePlus className='h-4 w-4' aria-hidden='true' />
                {tf("addContact")}
              </Buttons>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard id='seller-manager' icon={HiOutlineUserCircle} title={tf("manager")} hint={tf("managerHint")}>
        <FormField controller={{ control, name: "account_manager_name" }} label={t("fields.accountManager")}
          description={isNew ? tf("managerDefault") : undefined} className='col-span-12 md:col-span-6' />
      </SectionCard>

      <ActionBar message={submitError ?? (isDirty ? tf("unsaved") : undefined)}>
        <Link href={isNew ? SELLERS_HREF : `${SELLERS_HREF}/${seller!.id}`}
          className='inline-flex h-10 items-center rounded-full border border-border px-4 text-sm font-medium hover:bg-muted'>
          {tCommon("cancel")}
        </Link>
        <Buttons type='submit' className='rounded-full' loading={isSubmitting}>
          {isNew ? t("create") : tCommon("save")}
        </Buttons>
      </ActionBar>
    </form>
  );
};
