/** @format */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useFieldArray, useForm, useWatch, type Control, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormTextAreaField } from "@repo/ui/form/scenes/form-area";
import { FormSelectField } from "@repo/ui/form/scenes/form-select";
import { Buttons } from "@repo/ui/buttons/scenes";
import {
  HiOutlineBanknotes,
  HiOutlineBuildingLibrary,
  HiOutlineDocumentText,
  HiOutlineIdentification,
  HiOutlineMapPin,
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineUserGroup,
} from "react-icons/hi2";
import {
  ActionBar,
  EmptyBlock,
  SectionCard,
  SectionNav,
  Segmented,
  ToggleRow,
  type FormSectionItem,
} from "@/components/form-sections";
import { GeoCascadeFields } from "@/components/geo-cascade-fields";
import { notify } from "@/components/notifications";
import { formatMoney } from "@/lib/format";
import { formatTaxId } from "@/lib/tax-id";
import { cn } from "@/lib/utils";
import { Link } from "@/shared/i18n/routing";
import { get_city_path_action } from "@/server/domains/parametros/georeferencing/actions";
import {
  ACCOUNT_TYPES,
  CONTACT_AREAS,
  CURRENCIES,
  DOC_TYPES,
  PAYMENT_TERMS,
  SUPPLIERS_HREF,
  TAX_REGIMES,
  defaultPersonType,
  type ISupplier,
  type ISupplierSave,
} from "../models/supplier.interface";
import { validationSupplier, type SupplierFormValues } from "../schemas/supplier.schema";
import { SupplierStatusBadge } from "./supplier-status-badge";
import { createSupplierServerAction, updateSupplierServerAction } from "@/app/[locale]/inventory/suppliers/actions";

const str = (value: number | string | null | undefined) => (value == null ? "" : String(value));
const num = (value: string) => (value.trim() === "" ? undefined : Number(value));
const text = (value: string) => value.trim() || undefined;

const toValues = (supplier?: ISupplier | null): SupplierFormValues => ({
  code: supplier?.code ?? "",
  doc_type: supplier?.doc_type ?? "NIT",
  doc_number: supplier?.doc_number ?? "",
  person_type: supplier?.person_type ?? defaultPersonType(supplier?.doc_type ?? "NIT"),
  name: supplier?.name ?? "",
  trade_name: supplier?.trade_name ?? "",
  tax_regime: supplier?.tax_regime ?? "",
  great_contributor: Boolean(supplier?.great_contributor),
  self_retainer: Boolean(supplier?.self_retainer),
  email: supplier?.email ?? "",
  phone: supplier?.phone ?? "",
  website: supplier?.website ?? "",
  address: supplier?.address ?? "",
  country_id: str(supplier?.country_id),
  state_id: str(supplier?.state_id),
  city_id: str(supplier?.city_id),
  payment_term_days: str(supplier?.payment_term_days ?? 0),
  credit_limit: str(supplier?.credit_limit),
  currency: supplier?.currency ?? "COP",
  lead_time_days: str(supplier?.lead_time_days),
  min_order_amount: str(supplier?.min_order_amount),
  discount_percent: str(supplier?.discount_percent),
  bank_name: supplier?.bank_name ?? "",
  bank_account_type: supplier?.bank_account_type ?? "",
  bank_account_number: supplier?.bank_account_number ?? "",
  bank_account_holder: supplier?.bank_account_holder ?? "",
  bank_holder_document: supplier?.bank_holder_document ?? "",
  notes: supplier?.notes ?? "",
  contacts: (supplier?.contacts ?? []).map((contact) => ({
    name: contact.name ?? "",
    position: contact.position ?? "",
    area: contact.area ?? "VENTAS",
    phone: contact.phone ?? "",
    email: contact.email ?? "",
    primary: Boolean(contact.primary),
  })),
});

/**
 * Ficha del proveedor por secciones: identificación fiscal, contacto y ubicación (catálogo de
 * parametros), personas de contacto, condiciones comerciales, cuenta bancaria y notas, con
 * resumen lateral. Página propia para alta y edición.
 */
export const SupplierForm = ({ supplier }: { supplier?: ISupplier | null }) => {
  const t = useTranslations("Administre.supplier");
  const tf = useTranslations("Administre.supplier.form");
  const tOpt = useTranslations("Administre.supplier.options");
  const tCommon = useTranslations("Administre.common");
  const router = useRouter();
  const isNew = supplier?.id == null;
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    formState: { isSubmitting, isDirty, errors },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(validationSupplier()),
    defaultValues: toValues(supplier),
  });
  const values = useWatch({ control }) as SupplierFormValues;
  const contacts = useFieldArray({ control, name: "contacts" });
  const isCash = Number(values.payment_term_days || 0) === 0;

  const submit = async (form: SupplierFormValues) => {
    setSubmitError(null);
    // El nombre de la ciudad se guarda en la ficha para listados y documentos.
    const path = form.city_id ? await get_city_path_action(Number(form.city_id)) : null;
    if (form.city_id && !path?.city?.name) {
      notify.error(tCommon("errorTitle"), tf("cityUnresolved"));
      return;
    }
    const payload: ISupplierSave = {
      code: text(form.code)?.toUpperCase(),
      doc_type: form.doc_type,
      doc_number: form.doc_number.trim(),
      person_type: form.person_type || undefined,
      name: form.name.trim(),
      trade_name: text(form.trade_name),
      tax_regime: form.tax_regime || undefined,
      great_contributor: form.great_contributor,
      self_retainer: form.self_retainer,
      email: text(form.email),
      phone: text(form.phone),
      website: text(form.website),
      address: text(form.address),
      country_id: num(form.country_id),
      state_id: num(form.state_id),
      city_id: num(form.city_id),
      city: path?.city?.name ?? undefined,
      payment_term_days: Number(form.payment_term_days || 0),
      credit_limit: isCash ? undefined : num(form.credit_limit),
      currency: form.currency || "COP",
      lead_time_days: num(form.lead_time_days),
      min_order_amount: num(form.min_order_amount),
      discount_percent: num(form.discount_percent),
      bank_name: text(form.bank_name),
      bank_account_type: form.bank_account_type || undefined,
      bank_account_number: text(form.bank_account_number),
      bank_account_holder: text(form.bank_account_holder),
      bank_holder_document: text(form.bank_holder_document),
      notes: text(form.notes),
      contacts: form.contacts.map((contact) => ({
        name: contact.name.trim(),
        position: text(contact.position),
        area: contact.area || "VENTAS",
        phone: text(contact.phone),
        email: text(contact.email),
        primary: contact.primary,
      })),
    };
    const result = isNew ? await createSupplierServerAction(payload) : await updateSupplierServerAction(supplier!.id!, payload);
    if (!result.success) {
      // Errores por campo del backend (snake_case = nombre del campo del formulario).
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(field as Path<SupplierFormValues>, { type: "server", message });
      }
      setSubmitError(result.error);
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    notify.success(isNew ? tCommon("createdSuccess") : tCommon("updatedSuccess"), result.data?.display_name ?? payload.name);
    router.push(result.data?.id != null ? `${SUPPLIERS_HREF}/${result.data.id}` : SUPPLIERS_HREF);
    router.refresh();
  };

  const has = (...fields: (keyof SupplierFormValues)[]) => fields.some((field) => errors[field]);
  const bankFilled = Boolean(values.bank_name && values.bank_account_type && values.bank_account_number);
  const sections: FormSectionItem[] = [
    {
      id: "sp-fiscal",
      title: tf("fiscal"),
      state: has("doc_type", "doc_number", "person_type", "name", "trade_name", "code")
        ? "error"
        : values.doc_number?.trim() && values.name?.trim()
          ? "complete"
          : "pending",
    },
    {
      id: "sp-contact",
      title: tf("contact"),
      state: has("email", "phone", "website", "address", "country_id", "state_id", "city_id")
        ? "error"
        : values.phone?.trim() || values.email?.trim()
          ? "complete"
          : "optional",
    },
    { id: "sp-people", title: tf("people"), state: errors.contacts ? "error" : values.contacts?.length ? "complete" : "optional" },
    {
      id: "sp-terms",
      title: tf("terms"),
      state: has("payment_term_days", "credit_limit", "lead_time_days", "min_order_amount", "discount_percent") ? "error" : "complete",
    },
    {
      id: "sp-bank",
      title: tf("bank"),
      state: has("bank_name", "bank_account_type", "bank_account_number", "bank_account_holder", "bank_holder_document")
        ? "error"
        : bankFilled
          ? "complete"
          : "optional",
    },
    { id: "sp-notes", title: tf("notes"), state: has("notes") ? "error" : "optional" },
  ];
  const stateLabel = (state: FormSectionItem["state"]) => tf(`state.${state}`);
  const section = (id: string) => sections.find((item) => item.id === id)?.state ?? "optional";
  const document = formatTaxId(values.doc_type, values.doc_number);
  const termLabel = isCash ? tOpt("cash") : tOpt("credit", { days: Number(values.payment_term_days) });
  const primary = values.contacts?.find((contact) => contact.primary) ?? values.contacts?.[0];
  const geoSetValue = (name: string, value: string) => {
    const field = name as "country_id" | "state_id" | "city_id";
    setValue(field, value, { shouldDirty: true });
    clearErrors(field);
  };

  return (
    <form onSubmit={handleSubmit(submit)} className='grid gap-6' noValidate>
      <div className='grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_300px]'>
        <aside className='hidden lg:block'>
          <div className='sticky top-20'>
            <SectionNav items={sections} title={tf("sections")} progressLabel={tf("progress")} />
          </div>
        </aside>

        <div className='grid content-start gap-6'>
          {/* 1. Identificación fiscal */}
          <SectionCard id='sp-fiscal' icon={HiOutlineIdentification} title={tf("fiscal")} hint={tf("fiscalHint")}
            state={section("sp-fiscal")} stateLabel={stateLabel(section("sp-fiscal"))}>
            <FormSelectField controller={{ control, name: "doc_type" }} label={t("fields.docType")} required
              data={DOC_TYPES.map((type) => ({ value: type, label: tOpt(`docTypes.${type}`) }))}
              onValueChange={(type) => setValue("person_type", defaultPersonType(type), { shouldDirty: true })}
              triggerClassName='!w-full' className='col-span-12 md:col-span-4' />
            <FormField controller={{ control, name: "doc_number" }} label={t("fields.docNumber")} required
              inputMode={values.doc_type === "NIT" || values.doc_type === "CC" ? "numeric" : "text"}
              // Con NIT el sufijo existe desde antes de escribir: si aparece con la primera tecla, FormField
              // cambia de Input a InputGroup y el campo pierde el foco.
              suffix={values.doc_type === "NIT" ? <span className='tabular-nums text-muted-foreground'>DV {document?.split("-")[1] || "–"}</span> : undefined}
              description={values.doc_type === "NIT" ? tf("dvHint") : undefined} className='col-span-12 md:col-span-5' />
            <div className='col-span-12 grid gap-1.5 md:col-span-3'>
              <span className='text-sm font-medium text-foreground'>{t("fields.personType")}</span>
              <Segmented label={t("fields.personType")} value={(values.person_type || "JURIDICA") as "JURIDICA" | "NATURAL"}
                options={[
                  { value: "JURIDICA", label: tOpt("personTypes.JURIDICA") },
                  { value: "NATURAL", label: tOpt("personTypes.NATURAL") },
                ]}
                onChange={(type) => setValue("person_type", type, { shouldDirty: true, shouldValidate: true })} />
              {errors.person_type ? <p className='text-xs text-destructive'>{errors.person_type.message}</p> : null}
            </div>
            <FormField controller={{ control, name: "name" }} required
              label={values.person_type === "NATURAL" ? t("fields.fullName") : t("fields.legalName")}
              placeholder={values.person_type === "NATURAL" ? tf("fullNamePlaceholder") : tf("legalNamePlaceholder")}
              className='col-span-12 md:col-span-7' />
            <FormField controller={{ control, name: "trade_name" }} label={t("fields.tradeName")} description={tf("tradeNameHint")}
              className='col-span-12 md:col-span-5' />
            <FormSelectField controller={{ control, name: "tax_regime" }} label={t("fields.taxRegime")}
              data={TAX_REGIMES.map((regime) => ({ value: regime, label: tOpt(`regimes.${regime}`) }))}
              placeholder={tCommon("selectPlaceholder")} triggerClassName='!w-full' className='col-span-12 md:col-span-7' />
            <FormField controller={{ control, name: "code" }} label={t("fields.code")} description={isNew ? tf("codeHint") : undefined}
              placeholder={isNew ? "PROV_…" : undefined} className='col-span-12 md:col-span-5' />
            <div className='col-span-12 grid gap-3 md:grid-cols-2'>
              <ToggleRow id='sp-great' label={t("fields.greatContributor")} description={tf("greatContributorHint")}
                checked={Boolean(values.great_contributor)}
                onChange={(checked) => setValue("great_contributor", checked, { shouldDirty: true })} />
              <ToggleRow id='sp-retainer' label={t("fields.selfRetainer")} description={tf("selfRetainerHint")}
                checked={Boolean(values.self_retainer)}
                onChange={(checked) => setValue("self_retainer", checked, { shouldDirty: true })} />
            </div>
          </SectionCard>

          {/* 2. Contacto y ubicación */}
          <SectionCard id='sp-contact' icon={HiOutlineMapPin} title={tf("contact")} hint={tf("contactHint")}
            state={section("sp-contact")} stateLabel={stateLabel(section("sp-contact"))}>
            <FormField controller={{ control, name: "email" }} type='email' label={t("fields.email")} placeholder='compras@empresa.co'
              className='col-span-12 md:col-span-5' />
            <FormField controller={{ control, name: "phone" }} type='tel' label={t("fields.phone")} className='col-span-12 md:col-span-3' />
            <FormField controller={{ control, name: "website" }} label={t("fields.website")} placeholder='www.empresa.co'
              className='col-span-12 md:col-span-4' />
            {/* El schema con superRefine tipa distinto el control; el componente solo usa los tres campos geo. */}
            <GeoCascadeFields control={control as unknown as Control} setValue={geoSetValue}
              initialCountryId={str(supplier?.country_id)} initialStateId={str(supplier?.state_id)} />
            {supplier?.city && supplier.city_id == null && !values.country_id ? (
              <p className='col-span-12 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground'>{tf("legacyCity", { city: supplier.city })}</p>
            ) : null}
            <FormField controller={{ control, name: "address" }} label={t("fields.address")} className='col-span-12' />
          </SectionCard>

          {/* 3. Personas de contacto */}
          <SectionCard id='sp-people' icon={HiOutlineUserGroup} title={tf("people")} hint={tf("peopleHint")}
            state={section("sp-people")} stateLabel={stateLabel(section("sp-people"))}>
            {contacts.fields.length === 0 ? (
              <EmptyBlock icon={HiOutlineUserGroup} title={tf("noContacts")} description={tf("noContactsHint")}
                action={
                  <Buttons type='button' variant='outline' className='rounded-full'
                    onClick={() => contacts.append({ name: "", position: "", area: "VENTAS", phone: "", email: "", primary: true })}>
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
                      <FormField controller={{ control, name: `contacts.${index}.name` }} label={t("fields.contactName")} required
                        className='col-span-12 md:col-span-4' />
                      <FormField controller={{ control, name: `contacts.${index}.position` }} label={t("fields.position")}
                        className='col-span-6 md:col-span-4' />
                      <FormSelectField controller={{ control, name: `contacts.${index}.area` }} label={t("fields.area")}
                        data={CONTACT_AREAS.map((area) => ({ value: area, label: tOpt(`areas.${area}`) }))}
                        triggerClassName='!w-full' className='col-span-6 md:col-span-4' />
                      <FormField controller={{ control, name: `contacts.${index}.phone` }} type='tel' label={t("fields.phone")}
                        className='col-span-12 md:col-span-4' />
                      <FormField controller={{ control, name: `contacts.${index}.email` }} type='email' label={t("fields.email")}
                        className='col-span-12 md:col-span-5' />
                      <div className='col-span-12 flex items-end justify-between gap-2 md:col-span-3'>
                        <label className='flex h-10 cursor-pointer items-center gap-2 text-sm'>
                          <input type='radio' name='primary-contact' className='h-4 w-4 accent-primary' checked={isPrimary}
                            onChange={() =>
                              (values.contacts ?? []).forEach((_, i) =>
                                setValue(`contacts.${i}.primary`, i === index, { shouldDirty: true }),
                              )
                            } />
                          {tf("primary")}
                        </label>
                        <Buttons type='button' variant='ghost' size='icon' aria-label={tf("removeContact", { n: index + 1 })}
                          onClick={() => {
                            const remaining = contacts.fields.length - 1;
                            contacts.remove(index);
                            // Si se quita el principal, el primero restante pasa a serlo.
                            if (isPrimary && remaining > 0) setTimeout(() => setValue("contacts.0.primary", true, { shouldDirty: true }));
                          }}>
                          <HiOutlineTrash className='h-4 w-4 text-destructive' aria-hidden='true' />
                        </Buttons>
                      </div>
                    </fieldset>
                  );
                })}
                {errors.contacts?.message ? <p role='alert' className='text-sm text-destructive'>{errors.contacts.message}</p> : null}
                {contacts.fields.length < 20 ? (
                  <Buttons type='button' variant='outline' className='w-fit rounded-full'
                    onClick={() => contacts.append({ name: "", position: "", area: "VENTAS", phone: "", email: "", primary: false })}>
                    <HiOutlinePlus className='h-4 w-4' aria-hidden='true' />
                    {tf("addContact")}
                  </Buttons>
                ) : null}
              </div>
            )}
          </SectionCard>

          {/* 4. Condiciones comerciales */}
          <SectionCard id='sp-terms' icon={HiOutlineBanknotes} title={tf("terms")} hint={tf("termsHint")}
            state={section("sp-terms")} stateLabel={stateLabel(section("sp-terms"))}>
            <div className='col-span-12 grid gap-1.5'>
              <span className='text-sm font-medium text-foreground'>{t("fields.paymentTerm")}</span>
              <div className='flex flex-wrap items-center gap-3'>
                <Segmented label={t("fields.paymentTerm")}
                  value={(PAYMENT_TERMS as readonly number[]).includes(Number(values.payment_term_days || 0)) ? String(Number(values.payment_term_days || 0)) : "custom"}
                  options={[
                    ...PAYMENT_TERMS.map((days) => ({ value: String(days), label: days === 0 ? tOpt("cash") : tOpt("days", { days }) })),
                    { value: "custom", label: tOpt("customTerm") },
                  ]}
                  onChange={(value) => {
                    if (value !== "custom") setValue("payment_term_days", value, { shouldDirty: true, shouldValidate: true });
                    else setValue("payment_term_days", "120", { shouldDirty: true, shouldValidate: true });
                  }} />
                {!(PAYMENT_TERMS as readonly number[]).includes(Number(values.payment_term_days || 0)) ? (
                  <FormField controller={{ control, name: "payment_term_days" }} label={tf("customDays")} inputMode='numeric'
                    suffix={tOpt("daysSuffix")} className='w-40' />
                ) : null}
              </div>
              <p className='text-xs text-muted-foreground'>{isCash ? tf("cashHint") : tf("creditHint", { days: Number(values.payment_term_days) })}</p>
            </div>
            <FormField controller={{ control, name: "credit_limit" }} label={t("fields.creditLimit")} inputMode='decimal'
              prefix='$' disabled={isCash} description={isCash ? tf("creditDisabled") : tf("creditLimitHint")}
              className='col-span-12 md:col-span-5' />
            <FormSelectField controller={{ control, name: "currency" }} label={t("fields.currency")}
              data={CURRENCIES.map((code) => ({ value: code, label: tOpt(`currencies.${code}`) }))}
              triggerClassName='!w-full' className='col-span-12 md:col-span-3' />
            <FormField controller={{ control, name: "lead_time_days" }} label={t("fields.leadTime")} inputMode='numeric'
              suffix={tOpt("daysSuffix")} className='col-span-12 md:col-span-4' />
            <FormField controller={{ control, name: "min_order_amount" }} label={t("fields.minOrder")} inputMode='decimal' prefix='$'
              className='col-span-12 md:col-span-6' />
            <FormField controller={{ control, name: "discount_percent" }} label={t("fields.discount")} inputMode='decimal' suffix='%'
              className='col-span-12 md:col-span-6' />
          </SectionCard>

          {/* 5. Cuenta bancaria */}
          <SectionCard id='sp-bank' icon={HiOutlineBuildingLibrary} title={tf("bank")} hint={tf("bankHint")}
            state={section("sp-bank")} stateLabel={stateLabel(section("sp-bank"))}>
            <FormField controller={{ control, name: "bank_name" }} label={t("fields.bankName")} placeholder={tf("bankPlaceholder")}
              className='col-span-12 md:col-span-5' />
            <FormSelectField controller={{ control, name: "bank_account_type" }} label={t("fields.accountType")}
              data={ACCOUNT_TYPES.map((type) => ({ value: type, label: tOpt(`accountTypes.${type}`) }))}
              placeholder={tCommon("selectPlaceholder")} triggerClassName='!w-full' className='col-span-12 md:col-span-3' />
            <FormField controller={{ control, name: "bank_account_number" }} label={t("fields.accountNumber")} inputMode='numeric'
              autoComplete='off' className='col-span-12 md:col-span-4' />
            <FormField controller={{ control, name: "bank_account_holder" }} label={t("fields.accountHolder")}
              description={tf("holderHint")} className='col-span-12 md:col-span-7' />
            <FormField controller={{ control, name: "bank_holder_document" }} label={t("fields.holderDocument")}
              className='col-span-12 md:col-span-5' />
          </SectionCard>

          {/* 6. Notas */}
          <SectionCard id='sp-notes' icon={HiOutlineDocumentText} title={tf("notes")} hint={tf("notesHint")}
            state={section("sp-notes")} stateLabel={stateLabel(section("sp-notes"))}>
            <FormTextAreaField controller={{ control, name: "notes" }} label={t("fields.notes")} placeholder={tf("notesPlaceholder")}
              showCounter maxLength={1000} className='col-span-12' />
          </SectionCard>
        </div>

        <aside className='grid content-start gap-4 lg:sticky lg:top-20'>
          <section className='grid gap-3 rounded-2xl border border-border bg-card p-4 text-sm shadow-sm'>
            <div className='flex items-start justify-between gap-2'>
              <h3 className='text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground'>{tf("summary")}</h3>
              {!isNew ? <SupplierStatusBadge status={supplier?.status} /> : null}
            </div>
            <div>
              <p className='truncate text-base font-semibold text-foreground'>{values.trade_name?.trim() || values.name?.trim() || "—"}</p>
              {values.trade_name?.trim() && values.name?.trim() ? <p className='truncate text-xs text-muted-foreground'>{values.name}</p> : null}
              <p className='mt-1 font-mono text-xs tabular-nums text-muted-foreground'>{document || tf("noDocument")}</p>
            </div>
            <dl className='grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5'>
              <dt className='text-muted-foreground'>{t("fields.paymentTerm")}</dt>
              <dd className='truncate text-right font-medium'>{termLabel}</dd>
              {!isCash && values.credit_limit ? (
                <>
                  <dt className='text-muted-foreground'>{t("fields.creditLimit")}</dt>
                  <dd className='truncate text-right font-medium tabular-nums'>{formatMoney(Number(values.credit_limit))} {values.currency}</dd>
                </>
              ) : null}
              {values.lead_time_days ? (
                <>
                  <dt className='text-muted-foreground'>{t("fields.leadTime")}</dt>
                  <dd className='text-right font-medium'>{tOpt("days", { days: Number(values.lead_time_days) })}</dd>
                </>
              ) : null}
              <dt className='text-muted-foreground'>{tf("primary")}</dt>
              <dd className='truncate text-right font-medium'>{primary?.name?.trim() || "—"}</dd>
              <dt className='text-muted-foreground'>{tf("bank")}</dt>
              <dd className='truncate text-right font-medium'>
                {bankFilled ? `${values.bank_name} ····${values.bank_account_number.replace(/\D/g, "").slice(-4)}` : "—"}
              </dd>
            </dl>
            {values.great_contributor || values.self_retainer ? (
              <div className='flex flex-wrap gap-1.5'>
                {values.great_contributor ? <span className='rounded-full bg-muted px-2 py-0.5 text-xs'>{t("fields.greatContributor")}</span> : null}
                {values.self_retainer ? <span className='rounded-full bg-muted px-2 py-0.5 text-xs'>{t("fields.selfRetainer")}</span> : null}
              </div>
            ) : null}
          </section>
          {!isNew && supplier?.status === "BLOCKED" && supplier.block_reason ? (
            <section role='note' className='rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm'>
              <p className='font-medium text-destructive'>{tf("blockedNote")}</p>
              <p className='mt-1 text-muted-foreground'>{supplier.block_reason}</p>
            </section>
          ) : null}
          {submitError ? (
            <p role='alert' className='rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive'>{submitError}</p>
          ) : null}
        </aside>
      </div>

      <ActionBar message={isDirty ? tf("unsaved") : undefined}>
        <Link href={isNew ? SUPPLIERS_HREF : `${SUPPLIERS_HREF}/${supplier!.id}`}
          className='inline-flex h-10 items-center rounded-full border border-border px-5 text-sm font-medium text-foreground hover:bg-muted'>
          {tCommon("cancel")}
        </Link>
        <Buttons type='submit' loading={isSubmitting} className='rounded-full'>
          {isNew ? null : <HiOutlinePencilSquare className='h-4 w-4' aria-hidden='true' />}
          {isNew ? tf("create") : tCommon("save")}
        </Buttons>
      </ActionBar>
    </form>
  );
};
