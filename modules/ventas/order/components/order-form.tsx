/** @format */

"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useFieldArray, useForm, useWatch, type Control, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormTextAreaField } from "@repo/ui/form/scenes/form-area";
import { FormSelectField } from "@repo/ui/form/scenes/form-select";
import { Buttons } from "@repo/ui/buttons/scenes";
import {
  HiOutlineBuildingStorefront,
  HiOutlineDocumentText,
  HiOutlinePencilSquare,
  HiOutlineReceiptPercent,
  HiOutlineShoppingCart,
  HiOutlineTrash,
  HiOutlineTruck,
  HiOutlineUser,
} from "react-icons/hi2";
import { ActionBar, EmptyBlock, SectionCard, SectionNav, Segmented, type FormSectionItem } from "@/components/form-sections";
import { AsyncCombobox, skuOption, type ComboOption } from "@/components/async-combobox";
import { GeoCascadeFields } from "@/components/geo-cascade-fields";
import { notify } from "@/components/notifications";
import { formatMoney, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Link } from "@/shared/i18n/routing";
import { get_city_path_action } from "@/server/domains/parametros/georeferencing/actions";
import { lookup_skus_action } from "@/server/domains/lookups/actions";
import type { SkuLookupDto } from "@/server/domains/lookups/types";
import {
  CUSTOMER_DOC_TYPES,
  DISCOUNT_TYPES,
  EDITABLE_CHANNELS,
  ORDER_COMPANY_ID,
  ORDER_PRIORITIES,
  pick,
  type DeliveryMethod,
  type DiscountType,
  type OrderPriority,
} from "../constants";
import {
  ORDERS_HREF,
  type ICustomerByDocument,
  type ICustomerLookup,
  type INamedItem,
  type IOrder,
  type IOrderDetailsSave,
  type IOrderStore,
} from "../models/order.interface";
import { validationOrderForm, type OrderFormValues } from "../schemas/order-form.schema";
import { OrderStatusBadge } from "./order-status-badge";
import {
  createFullOrderServerAction,
  saveOrderDetailsServerAction,
  searchOrderCustomersServerAction,
  lookupCustomerByDocumentServerAction,
} from "@/app/[locale]/ventas/orders/actions";
import { OrderShippingOptions } from "./order-shipping-options";

const str = (value: number | string | null | undefined) => (value == null ? "" : String(value));
const num = (value: string) => (value.trim() === "" ? undefined : Number(value));
const text = (value: string) => value.trim() || undefined;
/** Id de un select: "none" (opción vacía) o texto no numérico = sin valor. */
const idOf = (value: string) => (/^\d+$/.test(value) && Number(value) > 0 ? Number(value) : undefined);

const toValues = (order?: IOrder | null): OrderFormValues => ({
  customer_id: str(order?.customer_id),
  customer_kind: order?.customer_kind ?? "PERSON",
  customer_doc_type: order?.customer_doc_type ?? "CC",
  customer_doc_number: order?.customer_doc_number ?? "",
  customer_name: order?.customer_name ?? "",
  customer_email: order?.customer_email ?? "",
  customer_phone: order?.customer_phone ?? "",
  billing_address: order?.billing_address ?? "",
  billing_city: order?.billing_city ?? "",
  delivery_method: order?.delivery_method ?? "SHIPPING",
  pickup_store_id: str(order?.pickup_store_id),
  recipient_name: order?.recipient_name ?? "",
  recipient_phone: order?.recipient_phone ?? "",
  ship_address: order?.ship_address ?? "",
  ship_address_detail: order?.ship_address_detail ?? "",
  ship_country_id: str(order?.ship_country_id),
  ship_state_id: str(order?.ship_state_id),
  ship_city_id: str(order?.ship_city_id),
  ship_postal_code: order?.ship_postal_code ?? "",
  delivery_notes: order?.delivery_notes ?? "",
  carrier_id: str(order?.carrier_id),
  shipping_amount: str(order?.shipping_amount ?? ""),
  promised_date: order?.promised_date ?? "",
  channel: order?.channel ?? "BACKOFFICE",
  store_id: str(order?.store_id),
  warehouse_id: str(order?.warehouse_id),
  assigned_to: order?.assigned_to ?? "",
  priority: order?.priority ?? "NORMAL",
  complementary_order: order?.complementary_order ?? "",
  discount_type: order?.discount_type ?? "NONE",
  discount_value: str(order?.discount_value),
  coupon_code: order?.coupon_code ?? "",
  internal_notes: order?.internal_notes ?? "",
  customer_notes: order?.customer_notes ?? "",
  lines: [],
});

interface IOrderFormProps {
  order?: IOrder | null;
  stores: IOrderStore[];
  warehouses: INamedItem[];
  carriers: INamedItem[];
}

/**
 * Orden por secciones: cliente (con búsqueda de clientes anteriores), productos (solo al
 * crear), entrega (envío con geo o retiro en tienda), origen, descuento y notas, con
 * resumen lateral de importes. En edición respeta lo que el estado de la orden permite.
 */
export const OrderForm = ({ order, stores, warehouses, carriers }: IOrderFormProps) => {
  const t = useTranslations("Administre.order");
  const tf = useTranslations("Administre.order.form");
  const tOpt = useTranslations("Administre.order.options");
  const tCommon = useTranslations("Administre.common");
  const router = useRouter();
  const isNew = order?.id == null;
  const pending = isNew || order?.state === "PENDING";
  const shipped = order?.state === "SHIPPED";
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    formState: { isSubmitting, isDirty, errors },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(validationOrderForm(isNew)),
    defaultValues: toValues(order),
  });
  const values = useWatch({ control }) as OrderFormValues;
  const lines = useFieldArray({ control, name: "lines" });
  const method = pick(["SHIPPING", "PICKUP"] as const, values.delivery_method, "SHIPPING") as DeliveryMethod;
  const discountType = pick(DISCOUNT_TYPES, values.discount_type, "NONE") as DiscountType;

  // ── Buscadores ─────────────────────────────────────────────────────────────
  const searchCustomers = useCallback(async (q: string): Promise<ComboOption<ICustomerLookup>[]> => {
    const found = await searchOrderCustomersServerAction(q);
    return found.map((customer, index) => ({
      value: String(index),
      label: customer.name ?? "—",
      hint: [customer.doc_number, customer.email ?? customer.phone].filter(Boolean).join(" · "),
      data: customer,
    }));
  }, []);
  const searchSkus = useCallback(async (q: string) => {
    const result = await lookup_skus_action({ q, sellable_only: true });
    if (!result.success) throw new Error(result.error);
    return result.data.map(skuOption);
  }, []);

  const set = (name: Path<OrderFormValues>, value: string) => {
    setValue(name, value as never, { shouldDirty: true });
    clearErrors(name);
  };
  const applyCustomer = (customer: ICustomerLookup) => {
    set("customer_kind", customer.kind ?? "PERSON");
    set("customer_doc_type", customer.doc_type ?? "CC");
    set("customer_doc_number", customer.doc_number ?? "");
    set("customer_name", customer.name ?? "");
    set("customer_email", customer.email ?? "");
    set("customer_phone", customer.phone ?? "");
    set("billing_address", customer.billing_address ?? "");
    set("billing_city", customer.billing_city ?? "");
    set("customer_id", str(customer.customer_id));
    if (method === "SHIPPING" && customer.ship_address) {
      set("recipient_name", customer.recipient_name ?? customer.name ?? "");
      set("recipient_phone", customer.recipient_phone ?? customer.phone ?? "");
      set("ship_address", customer.ship_address ?? "");
      set("ship_address_detail", customer.ship_address_detail ?? "");
      set("ship_postal_code", customer.ship_postal_code ?? "");
      set("ship_country_id", str(customer.ship_country_id));
      set("ship_state_id", str(customer.ship_state_id));
      set("ship_city_id", str(customer.ship_city_id));
      setGeoKey((key) => key + 1);
    }
    notify.info(tf("customerLoaded"), customer.name ?? undefined);
  };
  const [geoKey, setGeoKey] = useState(0);

  // ── Cliente por documento (registro central de personas) ──────────────────
  const [docLookup, setDocLookup] = useState<{ key: string; loading: boolean; result: ICustomerByDocument | null; error?: string }>({
    key: "",
    loading: false,
    result: null,
  });
  const lookupDocument = async (force = false) => {
    const number = (values.customer_doc_number ?? "").trim().replace(/[\s.]/g, "");
    const type = values.customer_doc_type || undefined;
    const key = `${type ?? ""}|${number}`;
    if (number.length < 3 || (!force && key === docLookup.key)) return;
    setDocLookup({ key, loading: true, result: null });
    const response = await lookupCustomerByDocumentServerAction(type, number, ORDER_COMPANY_ID);
    if (!response.success || !response.data) {
      setDocLookup({ key, loading: false, result: null, error: response.success ? undefined : response.error });
      return;
    }
    const found = response.data;
    setDocLookup({ key, loading: false, result: found });
    // Solo se completan los campos vacíos, salvo la identidad del registro central (nombre e id).
    const fill = (name: Path<OrderFormValues>, value: string | null | undefined, override = false) => {
      if (value == null || value === "") return;
      const current = String((values as Record<string, unknown>)[name] ?? "").trim();
      if (override || current === "") set(name, value);
    };
    const central = found.source === "CENTRAL";
    if (central) {
      fill("customer_name", found.name, true);
      set("customer_id", str(found.customer_id));
      if (found.doc_type) fill("customer_doc_type", found.doc_type, true);
      if (found.kind) fill("customer_kind", found.kind, true);
    } else if (found.source === "ORDERS") {
      fill("customer_name", found.name);
      fill("customer_kind", found.kind);
    } else {
      set("customer_id", "");
    }
    fill("customer_email", found.email);
    fill("customer_phone", found.phone);
    fill("billing_address", found.billing_address);
    fill("billing_city", found.billing_city);
    if (method === "SHIPPING" && found.ship_address && !(values.ship_address ?? "").trim()) {
      fill("recipient_name", found.recipient_name ?? found.name);
      fill("recipient_phone", found.recipient_phone ?? found.phone);
      fill("ship_address", found.ship_address);
      fill("ship_address_detail", found.ship_address_detail);
      fill("ship_postal_code", found.ship_postal_code);
      if (found.ship_city_id) {
        set("ship_country_id", str(found.ship_country_id));
        set("ship_state_id", str(found.ship_state_id));
        set("ship_city_id", str(found.ship_city_id));
        setGeoKey((value) => value + 1);
      }
    }
  };
  // La consulta es por tipo + número: si cambia el tipo con un número ya consultado, se repite.
  const lookupTypeRef = useRef(values.customer_doc_type);
  useEffect(() => {
    if (lookupTypeRef.current === values.customer_doc_type) return;
    lookupTypeRef.current = values.customer_doc_type;
    if (docLookup.key) void lookupDocument();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.customer_doc_type]);
  const addSku = (sku: SkuLookupDto | undefined) => {
    if (!sku?.sku_id) return;
    const index = (values.lines ?? []).findIndex((line) => line.sku_id === sku.sku_id);
    if (index >= 0) {
      setValue(`lines.${index}.quantity`, String(Number(values.lines[index]?.quantity || 0) + 1), { shouldDirty: true });
      return;
    }
    lines.append({
      sku_id: sku.sku_id,
      product_id: sku.product_id,
      label: sku.name ?? sku.code ?? `#${sku.sku_id}`,
      code: sku.code ?? "",
      unit_price: sku.unit_price ?? 0,
      available: sku.available,
      quantity: "1",
      discount: "0",
    });
    clearErrors("lines");
  };

  // ── Importes estimados (el backend calcula los definitivos) ───────────────
  const itemsSubtotal = isNew
    ? (values.lines ?? []).reduce(
        (sum, line) => sum + Math.max(line.unit_price * Number(line.quantity || 0) - Number(line.discount || 0), 0),
        0,
      )
    : (order?.items_subtotal ?? 0);
  const discountValue = Number(values.discount_value || 0);
  const discountEstimate =
    discountType === "PERCENT"
      ? Math.round(itemsSubtotal * Math.min(discountValue, 100)) / 100
      : discountType === "AMOUNT"
        ? Math.min(discountValue, itemsSubtotal)
        : discountType === "COUPON" && !isNew && values.coupon_code === order?.coupon_code
          ? (order?.discount_amount ?? 0)
          : 0;
  const shipping = method === "PICKUP" ? 0 : Number(values.shipping_amount || 0);
  const totalEstimate = Math.max(itemsSubtotal - discountEstimate, 0) + shipping;

  // ── Guardar ────────────────────────────────────────────────────────────────
  const submit = async (form: OrderFormValues) => {
    setSubmitError(null);
    const path = form.delivery_method === "SHIPPING" && form.ship_city_id ? await get_city_path_action(Number(form.ship_city_id)) : null;
    if (form.delivery_method === "SHIPPING" && form.ship_city_id && !path?.city?.name) {
      notify.error(tCommon("errorTitle"), tf("cityUnresolved"));
      return;
    }
    const details: IOrderDetailsSave = {
      channel: form.channel,
      store_id: idOf(form.store_id),
      warehouse_id: idOf(form.warehouse_id),
      assigned_to: form.assigned_to.trim(),
      priority: form.priority,
      complementary_order: form.complementary_order.trim(),
      internal_notes: form.internal_notes,
      customer_notes: form.customer_notes,
      customer: {
        customer_id: num(form.customer_id),
        kind: form.customer_kind,
        doc_type: form.customer_doc_number.trim() ? form.customer_doc_type : undefined,
        doc_number: text(form.customer_doc_number),
        name: text(form.customer_name),
        email: text(form.customer_email),
        phone: text(form.customer_phone),
        billing_address: text(form.billing_address),
        billing_city: text(form.billing_city),
      },
      delivery:
        form.delivery_method === "PICKUP"
          ? {
              method: "PICKUP",
              pickup_store_id: idOf(form.pickup_store_id),
              recipient_name: text(form.recipient_name),
              recipient_phone: text(form.recipient_phone),
              notes: text(form.delivery_notes),
              promised_date: form.promised_date || undefined,
            }
          : {
              method: "SHIPPING",
              recipient_name: text(form.recipient_name),
              recipient_phone: text(form.recipient_phone),
              address: text(form.ship_address),
              address_detail: text(form.ship_address_detail),
              country_id: num(form.ship_country_id),
              state_id: num(form.ship_state_id),
              city_id: num(form.ship_city_id),
              country: path?.country?.name ?? undefined,
              state: path?.state?.name ?? undefined,
              city: path?.city?.name ?? undefined,
              postal_code: text(form.ship_postal_code),
              notes: text(form.delivery_notes),
              carrier_id: idOf(form.carrier_id),
              shipping_amount: num(form.shipping_amount) ?? 0,
              promised_date: form.promised_date || undefined,
            },
      discount: pending
        ? {
            type: form.discount_type,
            value: form.discount_type === "PERCENT" || form.discount_type === "AMOUNT" ? num(form.discount_value) : undefined,
            coupon_code: form.discount_type === "COUPON" ? text(form.coupon_code) : undefined,
          }
        : undefined,
    };
    const result = isNew
      ? await createFullOrderServerAction({
          details,
          lines: form.lines.map((line) => ({
            sku_id: line.sku_id,
            product_id: line.product_id,
            quantity: Number(line.quantity),
            discount: num(line.discount) ?? 0,
          })),
        })
      : await saveOrderDetailsServerAction(order!.id!, details);
    if (!result.success) {
      for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
        setError(field as Path<OrderFormValues>, { type: "server", message });
      }
      setSubmitError(result.error);
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    notify.success(isNew ? tf("created") : tCommon("updatedSuccess"), result.data?.order_number ?? undefined);
    const id = result.data?.id ?? order?.id;
    router.push(id != null ? `${ORDERS_HREF}/${id}` : ORDERS_HREF);
    router.refresh();
  };

  // ── Secciones ──────────────────────────────────────────────────────────────
  const has = (...fields: (keyof OrderFormValues)[]) => fields.some((field) => errors[field]);
  const sections: FormSectionItem[] = [
    {
      id: "of-customer",
      title: tf("customer"),
      state: has("customer_name", "customer_email", "customer_phone", "customer_doc_number")
        ? "error"
        : values.customer_name?.trim() && (values.customer_email?.trim() || values.customer_phone?.trim())
          ? "complete"
          : "pending",
    },
    ...(isNew
      ? [
          {
            id: "of-lines",
            title: tf("lines"),
            state: (errors.lines ? "error" : values.lines?.length ? "complete" : "pending") as FormSectionItem["state"],
          },
        ]
      : []),
    {
      id: "of-delivery",
      title: tf("delivery"),
      state: has("recipient_name", "ship_address", "ship_city_id", "pickup_store_id", "shipping_amount", "recipient_phone")
        ? "error"
        : method === "PICKUP"
          ? values.pickup_store_id
            ? "complete"
            : "pending"
          : values.ship_address?.trim() && values.ship_city_id && values.recipient_name?.trim()
            ? "complete"
            : "pending",
    },
    { id: "of-origin", title: tf("origin"), state: has("assigned_to", "complementary_order") ? "error" : "complete" },
    {
      id: "of-discount",
      title: tf("discount"),
      state: has("discount_value", "coupon_code") ? "error" : discountType === "NONE" ? "optional" : "complete",
    },
    { id: "of-notes", title: tf("notes"), state: has("internal_notes", "customer_notes") ? "error" : "optional" },
  ];
  const section = (id: string) => sections.find((item) => item.id === id)?.state ?? "optional";
  const stateLabel = (id: string) => tf(`state.${section(id)}`);
  const storeOptions = stores.map((store) => ({ value: String(store.id), label: store.name ?? `#${store.id}` }));
  const warehouseOptions = warehouses.map((warehouse) => ({ value: String(warehouse.id), label: warehouse.name ?? `#${warehouse.id}` }));
  const carrierOptions = carriers.map((carrier) => ({ value: String(carrier.id), label: carrier.name ?? `#${carrier.id}` }));
  const geoSetValue = (name: string, value: string) => set(name as Path<OrderFormValues>, value);
  const backHref = isNew ? ORDERS_HREF : `${ORDERS_HREF}/${order!.id}`;

  return (
    <form onSubmit={handleSubmit(submit)} className='grid gap-6' noValidate>
      <div className='grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_300px]'>
        <aside className='hidden lg:block'>
          <div className='sticky top-20'>
            <SectionNav items={sections} title={tf("sections")} progressLabel={tf("progress")} />
          </div>
        </aside>

        <div className='grid content-start gap-6'>
          {/* 1. Cliente */}
          <SectionCard id='of-customer' icon={HiOutlineUser} title={tf("customer")} hint={tf("customerHint")}
            state={section("of-customer")} stateLabel={stateLabel("of-customer")}>
            <div className='col-span-12 grid gap-1.5'>
              <span className='text-sm font-medium text-foreground'>{tf("findCustomer")}</span>
              <AsyncCombobox<ICustomerLookup>
                value={null}
                onChange={(_, option) => option?.data && applyCustomer(option.data)}
                search={searchCustomers}
                minChars={2}
                placeholder={tf("findCustomerPlaceholder")}
                searchPlaceholder={tf("findCustomerPlaceholder")}
                renderOption={(option) => (
                  <div className='min-w-0'>
                    <p className='truncate'>{option.label}</p>
                    <p className='truncate text-xs text-muted-foreground'>
                      {[option.hint, option.data ? tf("ordersCount", { count: option.data.orders_count ?? 0 }) : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                )}
              />
              <p className='text-xs text-muted-foreground'>{tf("findCustomerHint")}</p>
            </div>
            <div className='col-span-12 grid gap-1.5 md:col-span-4'>
              <span className='text-sm font-medium text-foreground'>{t("fields.customerKind")}</span>
              <Segmented label={t("fields.customerKind")} value={(values.customer_kind || "PERSON") as "PERSON" | "COMPANY"}
                options={[
                  { value: "PERSON", label: tOpt("customerKinds.PERSON") },
                  { value: "COMPANY", label: tOpt("customerKinds.COMPANY") },
                ]}
                onChange={(kind) => {
                  set("customer_kind", kind);
                  if (kind === "COMPANY") set("customer_doc_type", "NIT");
                }} />
            </div>
            <FormSelectField controller={{ control, name: "customer_doc_type" }} label={t("fields.docType")}
              data={CUSTOMER_DOC_TYPES.map((type) => ({ value: type, label: tOpt(`docTypes.${type}`) }))}
              triggerClassName='!w-full' className='col-span-12 md:col-span-3' />
            <FormField controller={{ control, name: "customer_doc_number" }} label={t("fields.docNumber")}
              description={tf("docLookupHint")} onBlur={() => void lookupDocument()}
              onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void lookupDocument(true);
                }
              }}
              className='col-span-12 md:col-span-5' />
            <DocumentLookupStatus state={docLookup} selectedType={values.customer_doc_type} onRetry={() => void lookupDocument(true)} />
            <FormField controller={{ control, name: "customer_name" }} required
              label={values.customer_kind === "COMPANY" ? t("fields.legalName") : t("fields.customerName")}
              className='col-span-12 md:col-span-6' />
            <FormField controller={{ control, name: "customer_email" }} type='email' label={t("fields.email")}
              className='col-span-12 md:col-span-6' />
            <FormField controller={{ control, name: "customer_phone" }} type='tel' label={t("fields.phone")}
              description={tf("contactHint")} className='col-span-12 md:col-span-4' />
            <FormField controller={{ control, name: "billing_address" }} label={t("fields.billingAddress")}
              className='col-span-12 md:col-span-5' />
            <FormField controller={{ control, name: "billing_city" }} label={t("fields.billingCity")}
              className='col-span-12 md:col-span-3' />
          </SectionCard>

          {/* 2. Productos (solo al crear) */}
          {isNew ? (
            <SectionCard id='of-lines' icon={HiOutlineShoppingCart} title={tf("lines")} hint={tf("linesHint")}
              state={section("of-lines")} stateLabel={stateLabel("of-lines")}>
              <div className='col-span-12 grid gap-1.5'>
                <span className='text-sm font-medium text-foreground'>{tf("addProduct")}</span>
                <AsyncCombobox<SkuLookupDto>
                  value={null}
                  onChange={(_, option) => addSku(option?.data)}
                  search={searchSkus}
                  placeholder={tf("addProductPlaceholder")}
                  searchPlaceholder={tf("addProductPlaceholder")}
                  renderOption={(option) => (
                    <div className='flex items-center justify-between gap-3'>
                      <div className='min-w-0'>
                        <p className='truncate'>{option.label}</p>
                        <p className='truncate text-xs text-muted-foreground'>{option.hint}</p>
                      </div>
                      <span className={cn("shrink-0 text-xs tabular-nums", (option.data?.available ?? 0) > 0 ? "text-muted-foreground" : "text-destructive")}>
                        {tf("available", { count: option.data?.available ?? 0 })}
                      </span>
                    </div>
                  )}
                />
              </div>
              {lines.fields.length === 0 ? (
                <EmptyBlock icon={HiOutlineShoppingCart} title={tf("noLines")} description={tf("noLinesHint")} />
              ) : (
                <div className='col-span-12 overflow-x-auto rounded-xl border border-border'>
                  <table className='w-full min-w-[640px] text-sm'>
                    <thead className='bg-muted/40 text-left text-xs text-muted-foreground'>
                      <tr>
                        <th className='px-3 py-2 font-medium'>{t("items.fields.productId")}</th>
                        <th className='px-3 py-2 text-right font-medium'>{t("items.fields.unitPrice")}</th>
                        <th className='w-24 px-3 py-2 font-medium'>{t("items.fields.quantity")}</th>
                        <th className='w-32 px-3 py-2 font-medium'>{t("items.fields.discount")}</th>
                        <th className='px-3 py-2 text-right font-medium'>{t("items.fields.total")}</th>
                        <th className='w-10 px-2 py-2'><span className='sr-only'>{tCommon("actions")}</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.fields.map((field, index) => {
                        const line = values.lines?.[index];
                        const quantity = Number(line?.quantity || 0);
                        const total = Math.max((line?.unit_price ?? 0) * quantity - Number(line?.discount || 0), 0);
                        const short = line?.available != null && quantity > line.available;
                        return (
                          <tr key={field.id} className='border-t border-border align-top'>
                            <td className='px-3 py-2'>
                              <p className='font-medium text-foreground'>{line?.label}</p>
                              <p className='font-mono text-xs text-muted-foreground'>{line?.code}</p>
                              {short ? <p className='text-xs text-destructive'>{tf("shortStock", { count: line?.available ?? 0 })}</p> : null}
                            </td>
                            <td className='px-3 py-2 text-right tabular-nums'>{formatMoney(line?.unit_price ?? 0)}</td>
                            <td className='px-3 py-1.5'>
                              <FormField controller={{ control, name: `lines.${index}.quantity` }} inputMode='numeric'
                                aria-label={tf("quantityFor", { name: line?.label ?? "" })} label='' />
                            </td>
                            <td className='px-3 py-1.5'>
                              <FormField controller={{ control, name: `lines.${index}.discount` }} inputMode='decimal' prefix='$'
                                aria-label={tf("discountFor", { name: line?.label ?? "" })} label='' />
                            </td>
                            <td className='px-3 py-2 text-right font-medium tabular-nums'>{formatMoney(total)}</td>
                            <td className='px-2 py-1.5'>
                              <Buttons type='button' variant='ghost' size='icon' aria-label={tf("removeLine", { name: line?.label ?? "" })}
                                onClick={() => lines.remove(index)}>
                                <HiOutlineTrash className='h-4 w-4 text-destructive' aria-hidden='true' />
                              </Buttons>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {errors.lines?.message ? <p role='alert' className='col-span-12 text-sm text-destructive'>{errors.lines.message}</p> : null}
            </SectionCard>
          ) : null}

          {/* 3. Entrega */}
          <SectionCard id='of-delivery' icon={HiOutlineTruck} title={tf("delivery")} hint={shipped ? tf("deliveryLocked") : tf("deliveryHint")}
            state={section("of-delivery")} stateLabel={stateLabel("of-delivery")}>
            <div className='col-span-12 grid gap-1.5'>
              <span className='text-sm font-medium text-foreground'>{t("fields.deliveryMethod")}</span>
              <Segmented label={t("fields.deliveryMethod")} value={method}
                options={[
                  { value: "SHIPPING", label: tOpt("deliveryMethods.SHIPPING") },
                  { value: "PICKUP", label: tOpt("deliveryMethods.PICKUP") },
                ]}
                onChange={(value) => !shipped && set("delivery_method", value)} />
            </div>
            {method === "PICKUP" ? (
              <>
                <FormSelectField controller={{ control, name: "pickup_store_id" }} label={t("fields.pickupStore")} required
                  data={storeOptions} placeholder={tCommon("selectPlaceholder")} disabled={shipped}
                  triggerClassName='!w-full' className='col-span-12 md:col-span-6' />
                <FormField controller={{ control, name: "promised_date" }} type='date' label={t("fields.promisedDate")}
                  disabled={shipped} className='col-span-12 md:col-span-6' />
                <FormField controller={{ control, name: "recipient_name" }} label={tf("pickupBy")} disabled={shipped}
                  className='col-span-12 md:col-span-6' />
                <FormField controller={{ control, name: "recipient_phone" }} type='tel' label={t("fields.phone")} disabled={shipped}
                  className='col-span-12 md:col-span-6' />
              </>
            ) : (
              <>
                <div className='col-span-12 flex flex-wrap items-center justify-between gap-2'>
                  <p className='text-xs text-muted-foreground'>{tf("recipientHint")}</p>
                  <Buttons type='button' variant='outline' size='sm' className='rounded-full' disabled={shipped}
                    onClick={() => {
                      set("recipient_name", values.customer_name ?? "");
                      set("recipient_phone", values.customer_phone ?? "");
                    }}>
                    {tf("sameAsCustomer")}
                  </Buttons>
                </div>
                <FormField controller={{ control, name: "recipient_name" }} label={t("fields.recipientName")} required disabled={shipped}
                  className='col-span-12 md:col-span-7' />
                <FormField controller={{ control, name: "recipient_phone" }} type='tel' label={t("fields.recipientPhone")} disabled={shipped}
                  className='col-span-12 md:col-span-5' />
                <GeoCascadeFields key={geoKey} control={control as unknown as Control} setValue={geoSetValue}
                  countryFieldName='ship_country_id' stateFieldName='ship_state_id' cityFieldName='ship_city_id'
                  initialCountryId={values.ship_country_id} initialStateId={values.ship_state_id} />
                {order?.ship_city && !order.ship_city_id && !values.ship_city_id ? (
                  <p className='col-span-12 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground'>{tf("legacyCity", { city: order.ship_city })}</p>
                ) : null}
                <FormField controller={{ control, name: "ship_address" }} label={t("fields.address")} required disabled={shipped}
                  className='col-span-12 md:col-span-8' />
                <FormField controller={{ control, name: "ship_postal_code" }} label={t("fields.postalCode")} disabled={shipped}
                  className='col-span-12 md:col-span-4' />
                <FormField controller={{ control, name: "ship_address_detail" }} label={t("fields.addressDetail")}
                  placeholder={tf("addressDetailPlaceholder")} disabled={shipped} className='col-span-12' />
                <OrderShippingOptions
                  orderId={order?.id ?? null}
                  countryId={values.ship_country_id ?? ""}
                  stateId={values.ship_state_id ?? ""}
                  cityId={values.ship_city_id ?? ""}
                  warehouseId={values.warehouse_id ?? ""}
                  subtotal={itemsSubtotal}
                  lines={isNew ? (values.lines ?? []).map((line) => ({ sku_id: line.sku_id, quantity: Number(line.quantity || 0) })) : []}
                  carrierId={values.carrier_id ?? ""}
                  autoApply={pending && (!values.carrier_id || values.carrier_id === "none") && !Number(values.shipping_amount || 0)}
                  editable={pending}
                  onApply={(option) => {
                    set("carrier_id", String(option.carrier_id));
                    set("shipping_amount", String(option.total));
                    if (option.delivery_to) set("promised_date", option.delivery_to);
                  }}
                />
                <FormSelectField controller={{ control, name: "carrier_id" }} label={t("fields.carrier")}
                  data={[{ value: "none", label: tf("noCarrier") }, ...carrierOptions]} placeholder={tf("noCarrier")} disabled={shipped}
                  triggerClassName='!w-full' className='col-span-12 md:col-span-4' />
                <FormField controller={{ control, name: "shipping_amount" }} label={t("fields.shippingAmount")} inputMode='decimal' prefix='$'
                  disabled={!pending} description={!pending ? tf("lockedAfterPending") : undefined} className='col-span-12 md:col-span-4' />
                <FormField controller={{ control, name: "promised_date" }} type='date' label={t("fields.promisedDate")} disabled={shipped}
                  className='col-span-12 md:col-span-4' />
              </>
            )}
            <FormTextAreaField controller={{ control, name: "delivery_notes" }} label={t("fields.deliveryNotes")}
              placeholder={tf("deliveryNotesPlaceholder")} showCounter maxLength={500} className='col-span-12' />
          </SectionCard>

          {/* 4. Origen */}
          <SectionCard id='of-origin' icon={HiOutlineBuildingStorefront} title={tf("origin")} hint={tf("originHint")}
            state={section("of-origin")} stateLabel={stateLabel("of-origin")}>
            {order?.channel === "POS" ? (
              <div className='col-span-12 rounded-lg bg-muted/40 p-3 text-sm'>{tf("posChannel")}</div>
            ) : (
              <FormSelectField controller={{ control, name: "channel" }} label={t("fields.channel")}
                data={EDITABLE_CHANNELS.map((channel) => ({ value: channel, label: t(`channels.${channel}`) }))}
                triggerClassName='!w-full' className='col-span-12 md:col-span-4' />
            )}
            <FormSelectField controller={{ control, name: "store_id" }} label={t("fields.store")}
              data={[{ value: "none", label: tf("noStore") }, ...storeOptions]}
              onValueChange={(value) => {
                const store = stores.find((item) => String(item.id) === value);
                if (pending && store?.warehouse_id && idOf(values.warehouse_id ?? "") == null) set("warehouse_id", String(store.warehouse_id));
              }}
              triggerClassName='!w-full' className='col-span-12 md:col-span-4' />
            <FormSelectField controller={{ control, name: "warehouse_id" }} label={t("fields.warehouse")}
              data={[{ value: "none", label: tf("anyWarehouse") }, ...warehouseOptions]} disabled={!pending}
              description={!pending ? tf("lockedAfterPending") : tf("warehouseHint")}
              triggerClassName='!w-full' className='col-span-12 md:col-span-4' />
            <FormField controller={{ control, name: "assigned_to" }} label={t("fields.assignedTo")} placeholder={tf("assignedPlaceholder")}
              className='col-span-12 md:col-span-6' />
            <FormField controller={{ control, name: "complementary_order" }} label={t("fields.complementaryOrder")}
              description={tf("referenceHint")} className='col-span-12 md:col-span-6' />
            <div className='col-span-12 grid gap-1.5'>
              <span className='text-sm font-medium text-foreground'>{t("fields.priority")}</span>
              <Segmented label={t("fields.priority")} value={pick(ORDER_PRIORITIES, values.priority, "NORMAL") as OrderPriority}
                options={ORDER_PRIORITIES.map((priority) => ({ value: priority, label: tOpt(`priorities.${priority}`) }))}
                onChange={(value) => set("priority", value)} />
            </div>
          </SectionCard>

          {/* 5. Descuento */}
          <SectionCard id='of-discount' icon={HiOutlineReceiptPercent} title={tf("discount")}
            hint={pending ? tf("discountHint") : tf("discountLocked")} state={section("of-discount")} stateLabel={stateLabel("of-discount")}>
            <div className='col-span-12 grid gap-1.5'>
              <span className='text-sm font-medium text-foreground'>{t("fields.discountType")}</span>
              <Segmented label={t("fields.discountType")} value={discountType}
                options={DISCOUNT_TYPES.map((type) => ({ value: type, label: tOpt(`discountTypes.${type}`) }))}
                onChange={(value) => pending && set("discount_type", value)} />
            </div>
            {discountType === "PERCENT" || discountType === "AMOUNT" ? (
              <FormField controller={{ control, name: "discount_value" }} inputMode='decimal' disabled={!pending}
                label={discountType === "PERCENT" ? tf("discountPercent") : tf("discountAmount")}
                prefix={discountType === "AMOUNT" ? "$" : undefined} suffix={discountType === "PERCENT" ? "%" : undefined}
                description={tf("discountSpread")} className='col-span-12 md:col-span-5' />
            ) : null}
            {discountType === "COUPON" ? (
              <FormField controller={{ control, name: "coupon_code" }} label={t("fields.couponCode")} disabled={!pending}
                description={tf("couponHint")} className='col-span-12 md:col-span-5' />
            ) : null}
          </SectionCard>

          {/* 6. Notas */}
          <SectionCard id='of-notes' icon={HiOutlineDocumentText} title={tf("notes")} hint={tf("notesHint")}
            state={section("of-notes")} stateLabel={stateLabel("of-notes")}>
            <FormTextAreaField controller={{ control, name: "internal_notes" }} label={t("fields.internalNotes")}
              placeholder={tf("internalNotesPlaceholder")} showCounter maxLength={2000} className='col-span-12 md:col-span-6' />
            <FormTextAreaField controller={{ control, name: "customer_notes" }} label={t("fields.customerNotes")}
              placeholder={tf("customerNotesPlaceholder")} showCounter maxLength={2000} className='col-span-12 md:col-span-6' />
          </SectionCard>
        </div>

        <aside className='grid content-start gap-4 lg:sticky lg:top-20'>
          <section className='grid gap-3 rounded-2xl border border-border bg-card p-4 text-sm shadow-sm'>
            <div className='flex items-start justify-between gap-2'>
              <h3 className='text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground'>{tf("summary")}</h3>
              {!isNew ? <OrderStatusBadge state={order?.state} /> : null}
            </div>
            <div>
              <p className='truncate text-base font-semibold text-foreground'>{values.customer_name?.trim() || tf("noCustomer")}</p>
              <p className='truncate text-xs text-muted-foreground'>
                {[values.customer_doc_number?.trim(), values.customer_email?.trim() || values.customer_phone?.trim()].filter(Boolean).join(" · ") || "—"}
              </p>
            </div>
            <dl className='grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5'>
              <dt className='text-muted-foreground'>{tf("itemsSubtotal")}</dt>
              <dd className='text-right tabular-nums'>{formatMoney(itemsSubtotal)}</dd>
              {isNew ? (
                <>
                  <dt className='text-muted-foreground'>{t("fields.units")}</dt>
                  <dd className='text-right tabular-nums'>
                    {formatNumber((values.lines ?? []).reduce((sum, line) => sum + Number(line.quantity || 0), 0))}
                  </dd>
                </>
              ) : null}
              <dt className='text-muted-foreground'>{tf("discount")}</dt>
              <dd className='text-right tabular-nums'>
                {discountType === "COUPON" && discountEstimate === 0 ? tf("couponOnSave") : `− ${formatMoney(discountEstimate)}`}
              </dd>
              <dt className='text-muted-foreground'>{t("fields.shippingAmount")}</dt>
              <dd className='text-right tabular-nums'>{method === "PICKUP" ? tf("pickupFree") : formatMoney(shipping)}</dd>
              <dt className='border-t border-border pt-2 font-medium text-foreground'>{tf("estimatedTotal")}</dt>
              <dd className='border-t border-border pt-2 text-right text-base font-semibold tabular-nums'>{formatMoney(totalEstimate)}</dd>
            </dl>
            <p className='text-xs text-muted-foreground'>{tf("taxesIncluded")}</p>
          </section>
          {!pending && !isNew ? (
            <section role='note' className='rounded-2xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground'>
              {tf("editRules")}
            </section>
          ) : null}
          {submitError ? (
            <p role='alert' className='rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive'>{submitError}</p>
          ) : null}
        </aside>
      </div>

      <ActionBar message={isDirty ? tf("unsaved") : undefined}>
        <Link href={backHref}
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

/** Resultado de la consulta por documento en el registro central de personas. */
const DocumentLookupStatus = ({
  state,
  selectedType,
  onRetry,
}: {
  state: { key: string; loading: boolean; result: ICustomerByDocument | null; error?: string };
  selectedType?: string;
  onRetry: () => void;
}) => {
  const tf = useTranslations("Administre.order.form");
  const tOpt = useTranslations("Administre.order.options");
  if (!state.key) return null;
  const result = state.result;
  const box = "col-span-12 flex flex-wrap items-start justify-between gap-2 rounded-xl border p-3 text-sm";
  if (state.loading) {
    return (
      <div role='status' className={cn(box, "border-border bg-muted/30 text-muted-foreground")}>
        {tf("lookupLoading")}
      </div>
    );
  }
  if (!result) {
    return (
      <div role='status' className={cn(box, "border-amber-500/30 bg-amber-500/5")}>
        <span>{state.error ?? tf("lookupUnavailable")}</span>
        <button type='button' onClick={onRetry} className='text-xs font-medium text-primary underline-offset-4 hover:underline'>
          {tf("lookupRetry")}
        </button>
      </div>
    );
  }
  const central = result.central_status;
  const docType = result.doc_type && CUSTOMER_DOC_TYPES.includes(result.doc_type as never) ? tOpt(`docTypes.${result.doc_type as "CC"}`) : result.doc_type;
  return (
    <div role='status' className={cn(box, central === "FOUND" ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-muted/30")}>
      <div className='min-w-0 space-y-0.5'>
        {central === "FOUND" ? (
          <>
            <p className='font-medium text-foreground'>{tf("lookupFound", { name: result.name ?? "" })}</p>
            <p className='text-xs text-muted-foreground'>
              {result.username
                ? tf("lookupUser", { username: result.username, status: result.user_status ?? "" })
                : tf("lookupNoUser")}
              {result.person_status && result.person_status !== "ACTIVE" ? ` · ${tf("lookupPersonStatus", { status: result.person_status })}` : ""}
            </p>
            {!result.type_matches ? (
              <p className='text-xs text-amber-700 dark:text-amber-400'>
                {tf("lookupTypeMismatch", { type: docType ?? "", selected: selectedType ?? "" })}
              </p>
            ) : null}
          </>
        ) : (
          <p className='text-foreground'>
            {central === "NOT_FOUND" ? tf("lookupNotFound") : central === "DISABLED" ? tf("lookupDisabled") : tf("lookupUnavailable")}
          </p>
        )}
        {(result.orders_count ?? 0) > 0 ? (
          <p className='text-xs text-muted-foreground'>{tf("lookupOrders", { count: result.orders_count })}</p>
        ) : null}
      </div>
      {central === "UNAVAILABLE" ? (
        <button type='button' onClick={onRetry} className='text-xs font-medium text-primary underline-offset-4 hover:underline'>
          {tf("lookupRetry")}
        </button>
      ) : null}
    </div>
  );
};
