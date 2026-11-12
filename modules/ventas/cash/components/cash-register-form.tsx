/** @format */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormSelectField } from "@repo/ui/form/scenes/form-select";
import { Buttons } from "@repo/ui/buttons/scenes";
import {
  HiOutlineBanknotes,
  HiOutlineComputerDesktop,
  HiOutlineCreditCard,
  HiOutlineDocumentCheck,
  HiOutlineLockClosed,
  HiOutlinePrinter,
} from "react-icons/hi2";
import { ActionBar, ChoiceCard, SectionCard, SectionNav, Segmented, ToggleRow, type FormSectionItem } from "@/components/form-sections";
import { notify } from "@/components/notifications";
import { formatMoney } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import { cn } from "@/lib/utils";
import { TicketPreview } from "./ticket-preview";
import {
  OPENING_MODES,
  RECEIPT_WIDTHS,
  REGISTERS_HREF,
  codeFromName,
  type ICashRegister,
  type INamedOption,
  type IRegisterMethodOption,
  type IStore,
  type OpeningModeValue,
  type ReceiptWidth,
} from "../models/cash.interface";
import { toAmount, validationCashRegister, type CashRegisterFormValues } from "../schemas/cash.schema";
import { createCashRegisterServerAction, updateCashRegisterServerAction } from "@/app/[locale]/ventas/cash-registers/actions";

const amountText = (value?: number | null) => (value == null ? "" : String(value));

interface CashRegisterFormProps {
  register?: ICashRegister | null;
  stores: IStore[];
  warehouses: INamedOption[];
  methods: IRegisterMethodOption[];
  billingReady: boolean;
}

/**
 * Caja por secciones: identificación (tienda, equipo), medios de pago habilitados, efectivo
 * (base y tope), cierre (arqueo ciego y tolerancia), ventas (descuento máximo, factura
 * automática, bodega) e impresión, con vista previa del ticket y resumen de reglas.
 */
export const CashRegisterForm = ({ register, stores, warehouses, methods, billingReady }: CashRegisterFormProps) => {
  const t = useTranslations("Administre.cash.register");
  const tf = useTranslations("Administre.cash.register.form");
  const tCommon = useTranslations("Administre.common");
  const router = useRouter();
  const isNew = register?.id == null;
  const counterMethods = methods.filter((m) => m.active !== false && m.kind !== "GATEWAY");
  const activeStores = stores.filter((s) => s.active !== false || s.id === register?.store_id);

  const {
    control,
    handleSubmit,
    setValue,
    getFieldState,
    formState: { isSubmitting, isDirty, errors, submitCount },
  } = useForm<CashRegisterFormValues>({
    resolver: zodResolver(validationCashRegister()),
    defaultValues: {
      name: register?.name ?? "",
      code: register?.code ?? "",
      store_id: register?.store_id != null ? String(register.store_id) : activeStores.length === 1 && activeStores[0]?.id != null ? String(activeStores[0].id) : "",
      location: register?.location ?? "",
      device_name: register?.device_name ?? "",
      warehouse_id: register?.warehouse_id != null ? String(register.warehouse_id) : "",
      restrict_methods: (register?.allowed_method_ids ?? []).length > 0,
      allowed_method_ids: register?.allowed_method_ids ?? [],
      opening_mode: (OPENING_MODES as readonly string[]).includes(register?.opening_mode ?? "") ? (register!.opening_mode as OpeningModeValue) : "FREE",
      default_opening_amount: amountText(register?.default_opening_amount),
      cash_limit: amountText(register?.cash_limit),
      blind_close: Boolean(register?.blind_close),
      difference_tolerance: amountText(register?.difference_tolerance ?? 0),
      max_discount_percent: amountText(register?.max_discount_percent),
      auto_invoice: Boolean(register?.auto_invoice),
      receipt_width: register?.receipt_width === "58MM" ? "58MM" : "80MM",
      active: register?.active !== false,
    },
  });
  const values = useWatch({ control }) as CashRegisterFormValues;
  const dirty = { shouldDirty: true, shouldValidate: submitCount > 0 } as const;

  useEffect(() => {
    if (isNew && !getFieldState("code").isDirty && typeof values.name === "string") {
      setValue("code", codeFromName(values.name), { shouldValidate: false });
    }
  }, [isNew, values.name, getFieldState, setValue]);

  const store = stores.find((s) => String(s.id) === values.store_id);
  const storeWarehouse = warehouses.find((w) => w.id === store?.warehouse_id)?.name;
  const effectiveWarehouse = values.warehouse_id
    ? warehouses.find((w) => String(w.id) === values.warehouse_id)?.name
    : storeWarehouse;
  const allowed = values.allowed_method_ids ?? [];
  const toggleMethod = (id: number, checked: boolean) =>
    setValue("allowed_method_ids", checked ? [...allowed, id] : allowed.filter((value) => value !== id), dirty);

  const submit = async (form: CashRegisterFormValues) => {
    const number = (value: string) => {
      const parsed = toAmount(value);
      return parsed == null || Number.isNaN(parsed) ? undefined : parsed;
    };
    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      store_id: Number(form.store_id),
      location: form.location.trim() || undefined,
      device_name: form.device_name.trim() || undefined,
      warehouse_id: form.warehouse_id ? Number(form.warehouse_id) : undefined,
      allowed_method_ids: form.restrict_methods ? form.allowed_method_ids : [],
      opening_mode: form.opening_mode,
      default_opening_amount: number(form.default_opening_amount),
      cash_limit: number(form.cash_limit),
      blind_close: form.blind_close,
      difference_tolerance: number(form.difference_tolerance) ?? 0,
      max_discount_percent: number(form.max_discount_percent),
      auto_invoice: form.auto_invoice,
      receipt_width: form.receipt_width,
      active: form.active,
    };
    const result = isNew ? await createCashRegisterServerAction(payload) : await updateCashRegisterServerAction(register!.id!, payload);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    notify.success(isNew ? tCommon("createdSuccess") : tCommon("updatedSuccess"), result.data.name);
    router.push(REGISTERS_HREF);
    router.refresh();
  };

  // ─── Estado de secciones ──────────────────────────────────────────────────────
  const has = (...fields: (keyof CashRegisterFormValues)[]) => fields.some((field) => errors[field]);
  const sections: FormSectionItem[] = [
    { id: "cr-basic", title: tf("basic"), state: has("name", "code", "store_id", "location", "device_name") ? "error" : values.name?.trim() && values.store_id ? "complete" : "pending" },
    { id: "cr-methods", title: tf("methods"), state: has("allowed_method_ids") ? "error" : values.restrict_methods ? "complete" : "optional" },
    { id: "cr-cash", title: tf("cash"), state: has("opening_mode", "default_opening_amount", "cash_limit") ? "error" : values.opening_mode !== "FREE" || values.cash_limit ? "complete" : "optional" },
    { id: "cr-close", title: tf("close"), state: has("difference_tolerance") ? "error" : values.blind_close ? "complete" : "optional" },
    { id: "cr-sales", title: tf("sales"), state: has("max_discount_percent", "warehouse_id") ? "error" : "optional" },
    { id: "cr-print", title: tf("print"), state: "optional" },
  ];
  const stateLabel = (state: FormSectionItem["state"]) => tf(`state.${state}`);
  const base = toAmount(values.default_opening_amount);
  const limit = toAmount(values.cash_limit);
  const tolerance = toAmount(values.difference_tolerance);
  const discount = toAmount(values.max_discount_percent);
  const methodsError = (errors.allowed_method_ids as { message?: string } | undefined)?.message;

  const rules = [
    values.restrict_methods
      ? tf("ruleMethods", { names: counterMethods.filter((m) => m.id != null && allowed.includes(m.id)).map((m) => m.name).join(", ") || "—" })
      : tf("ruleAllMethods"),
    values.opening_mode === "FIXED" && base != null
      ? tf("ruleFixed", { amount: formatMoney(base) })
      : values.opening_mode === "SUGGESTED" && base != null
        ? tf("ruleSuggested", { amount: formatMoney(base) })
        : tf("ruleFree"),
    limit != null && !Number.isNaN(limit) ? tf("ruleLimit", { amount: formatMoney(limit) }) : null,
    values.blind_close ? tf("ruleBlind") : null,
    tolerance ? tf("ruleTolerance", { amount: formatMoney(tolerance) }) : tf("ruleToleranceZero"),
    discount != null && !Number.isNaN(discount) ? tf("ruleDiscount", { percent: discount }) : null,
    values.auto_invoice ? tf("ruleInvoice") : null,
  ].filter(Boolean) as string[];

  return (
    <form onSubmit={handleSubmit(submit)} className='grid gap-6'>
      <div className='grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_320px]'>
        <aside className='hidden lg:block'>
          <div className='sticky top-20'>
            <SectionNav items={sections} title={tf("sections")} progressLabel={tf("progress")} />
          </div>
        </aside>

        <div className='grid content-start gap-6'>
          {/* ─── Identificación ─── */}
          <SectionCard id='cr-basic' icon={HiOutlineComputerDesktop} title={tf("basic")} hint={tf("basicHint")}
            state={sections[0]?.state} stateLabel={stateLabel(sections[0]?.state ?? "pending")}>
            <FormField controller={{ control, name: "name" }} label={t("fields.name")} placeholder={tf("namePlaceholder")} required
              className='col-span-12 md:col-span-7' />
            <FormField controller={{ control, name: "code" }} label={t("fields.code")} description={t("codeHint")}
              className='col-span-12 md:col-span-5' />
            <FormSelectField controller={{ control, name: "store_id" }} label={t("fields.store")}
              data={activeStores.filter((s) => s.id != null).map((s) => ({ value: String(s.id), label: s.name ?? `#${s.id}` }))}
              placeholder={tCommon("selectPlaceholder")} triggerClassName='!w-full' className='col-span-12 md:col-span-6' />
            <FormField controller={{ control, name: "location" }} label={t("fields.location")} placeholder={tf("locationPlaceholder")}
              className='col-span-12 md:col-span-6' />
            <FormField controller={{ control, name: "device_name" }} label={t("fields.deviceName")} description={tf("deviceHint")}
              className='col-span-12 md:col-span-6' />
            <div className='col-span-12 md:col-span-6'>
              <ToggleRow id='register-active' label={t("fields.active")} description={t("activeHint")} checked={Boolean(values.active)}
                onChange={(checked) => setValue("active", checked, dirty)} />
            </div>
            {stores.length === 0 ? (
              <p className='col-span-12 text-sm text-amber-700 dark:text-amber-400'>
                {tf("noStores")}{" "}
                <Link href='/ventas/stores/new' className='font-medium text-primary underline-offset-4 hover:underline'>{tf("createStore")}</Link>
              </p>
            ) : null}
          </SectionCard>

          {/* ─── Medios de pago ─── */}
          <SectionCard id='cr-methods' icon={HiOutlineCreditCard} title={tf("methods")} hint={tf("methodsHint")}
            state={sections[1]?.state} stateLabel={stateLabel(sections[1]?.state ?? "optional")}>
            <div className='col-span-12'>
              <ToggleRow id='register-restrict' label={tf("restrict")} description={tf("restrictHint")} checked={Boolean(values.restrict_methods)}
                onChange={(checked) => {
                  setValue("restrict_methods", checked, dirty);
                  if (checked && allowed.length === 0) {
                    setValue("allowed_method_ids", counterMethods.filter((m) => m.id != null).map((m) => m.id as number), dirty);
                  }
                }} />
            </div>
            {values.restrict_methods ? (
              <fieldset className='col-span-12 grid gap-2 sm:grid-cols-2'>
                <legend className='sr-only'>{tf("methods")}</legend>
                {counterMethods.map((m) => {
                  const checked = m.id != null && allowed.includes(m.id);
                  return (
                    <label key={m.id}
                      className={cn("flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm", checked ? "border-primary/50 bg-primary/5" : "border-border")}>
                      <input type='checkbox' className='h-4 w-4 accent-primary' checked={checked}
                        onChange={(event) => m.id != null && toggleMethod(m.id, event.target.checked)} />
                      <span className='min-w-0'>
                        <span className='block font-medium'>{m.name}</span>
                        <span className='block text-xs text-muted-foreground'>{m.kind}</span>
                      </span>
                    </label>
                  );
                })}
                {methodsError ? <p role='alert' className='text-sm text-destructive sm:col-span-2'>{methodsError}</p> : null}
              </fieldset>
            ) : null}
          </SectionCard>

          {/* ─── Efectivo ─── */}
          <SectionCard id='cr-cash' icon={HiOutlineBanknotes} title={tf("cash")} hint={tf("cashHint")}
            state={sections[2]?.state} stateLabel={stateLabel(sections[2]?.state ?? "optional")}>
            <div role='radiogroup' aria-label={tf("openingMode")} className='col-span-12 grid gap-3 md:grid-cols-3'>
              {OPENING_MODES.map((mode) => (
                <ChoiceCard key={mode} name='opening-mode' value={mode} icon={HiOutlineBanknotes} title={tf(`openingModes.${mode}`)}
                  description={tf(`openingModeHints.${mode}`)} selected={values.opening_mode === mode}
                  onSelect={() => setValue("opening_mode", mode, dirty)} />
              ))}
            </div>
            <FormField controller={{ control, name: "default_opening_amount" }} type='number' inputMode='decimal' min={0} step='any'
              label={values.opening_mode === "FIXED" ? tf("fixedBase") : tf("suggestedBase")}
              description={values.opening_mode === "FREE" ? tf("baseOptional") : undefined}
              className='col-span-12 md:col-span-6' />
            <FormField controller={{ control, name: "cash_limit" }} type='number' inputMode='decimal' min={0} step='any' label={t("fields.cashLimit")}
              description={tf("cashLimitHint")} className='col-span-12 md:col-span-6' />
          </SectionCard>

          {/* ─── Cierre ─── */}
          <SectionCard id='cr-close' icon={HiOutlineLockClosed} title={tf("close")} hint={tf("closeHint")}
            state={sections[3]?.state} stateLabel={stateLabel(sections[3]?.state ?? "optional")}>
            <div className='col-span-12'>
              <ToggleRow id='register-blind' label={t("fields.blindClose")} description={tf("blindHint")} checked={Boolean(values.blind_close)}
                onChange={(checked) => setValue("blind_close", checked, dirty)} />
            </div>
            <FormField controller={{ control, name: "difference_tolerance" }} type='number' inputMode='decimal' min={0} step='any'
              label={t("fields.differenceTolerance")} description={tf("toleranceHint")} className='col-span-12 md:col-span-6' />
          </SectionCard>

          {/* ─── Ventas ─── */}
          <SectionCard id='cr-sales' icon={HiOutlineDocumentCheck} title={tf("sales")} hint={tf("salesHint")}
            state={sections[4]?.state} stateLabel={stateLabel(sections[4]?.state ?? "optional")}>
            <FormField controller={{ control, name: "max_discount_percent" }} type='number' inputMode='decimal' min={0} max={100} step='any'
              label={t("fields.maxDiscount")} description={tf("discountHint")} suffix='%' className='col-span-12 md:col-span-6' />
            <FormSelectField controller={{ control, name: "warehouse_id" }} label={tf("warehouseOverride")}
              description={tf("warehouseOverrideHint", { warehouse: storeWarehouse ?? "—" })}
              data={[{ value: "", label: tf("storeWarehouse") }, ...warehouses.filter((w) => w.id != null).map((w) => ({ value: String(w.id), label: w.name ?? `#${w.id}` }))]}
              triggerClassName='!w-full' className='col-span-12 md:col-span-6' />
            <div className='col-span-12'>
              <ToggleRow id='register-invoice' label={t("fields.autoInvoice")}
                description={billingReady ? tf("invoiceHint") : tf("invoiceNotReady")} checked={Boolean(values.auto_invoice)}
                onChange={(checked) => setValue("auto_invoice", checked, dirty)} />
            </div>
          </SectionCard>

          {/* ─── Impresión ─── */}
          <SectionCard id='cr-print' icon={HiOutlinePrinter} title={tf("print")} hint={tf("printHint")}
            state={sections[5]?.state} stateLabel={stateLabel(sections[5]?.state ?? "optional")}>
            <div className='col-span-12'>
              <Segmented<ReceiptWidth> label={t("fields.receiptWidth")} value={values.receipt_width ?? "80MM"}
                options={RECEIPT_WIDTHS.map((width) => ({ value: width, label: tf(`widths.${width}`) }))}
                onChange={(width) => setValue("receipt_width", width, dirty)} />
            </div>
          </SectionCard>
        </div>

        <aside className='grid content-start gap-4 lg:sticky lg:top-20'>
          <section className='grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm'>
            <h3 className='text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground'>{tf("preview")}</h3>
            <div className='overflow-x-auto rounded-xl bg-muted/40 p-3'>
              <TicketPreview
                width={values.receipt_width}
                data={{
                  storeName: store?.name,
                  address: store?.address,
                  city: store?.city,
                  phone: store?.phone,
                  header: store?.ticket_header,
                  footer: store?.ticket_footer,
                  registerName: values.name?.trim() || tf("namePlaceholder"),
                  cashier: tf("sampleCashier"),
                  date: new Date().toLocaleDateString(),
                  lines: [
                    { name: tf("sampleItem1"), quantity: 2, total: 70000 },
                    { name: tf("sampleItem2"), quantity: 1, total: 2500 },
                  ],
                  total: 72500,
                  tax: 11576,
                  payments: [{ name: tf("sampleCash"), amount: 100000 }],
                  change: 27500,
                  invoiceNumber: values.auto_invoice ? tf("sampleInvoice") : undefined,
                }}
              />
            </div>
            {!store?.ticket_header && !store?.ticket_footer ? (
              <p className='text-xs text-muted-foreground'>{tf("ticketFromStore")}</p>
            ) : null}
          </section>
          <section className='grid gap-2 rounded-2xl border border-border bg-card p-4 text-sm shadow-sm'>
            <h3 className='text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground'>{tf("rules")}</h3>
            <p>
              <span className='text-muted-foreground'>{tf("salesFrom")} </span>
              <span className='font-medium'>{effectiveWarehouse ?? "—"}</span>
            </p>
            <ul className='grid gap-1 text-xs text-muted-foreground'>
              {rules.map((rule) => (
                <li key={rule}>• {rule}</li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <ActionBar message={isDirty ? tf("unsaved") : undefined}>
        <Link href={REGISTERS_HREF}
          className='inline-flex h-10 items-center rounded-full border border-border px-5 text-sm font-medium text-foreground hover:bg-muted'>
          {tCommon("cancel")}
        </Link>
        <Buttons type='submit' loading={isSubmitting} className='rounded-full'>
          {isNew ? tf("create") : tCommon("save")}
        </Buttons>
      </ActionBar>
    </form>
  );
};
