/** @format */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useFieldArray, useForm, useWatch, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "@repo/ui/form/scenes/form-field";
import { FormSelectField } from "@repo/ui/form/scenes/form-select";
import { FormTextAreaField } from "@repo/ui/form/scenes/form-area";
import { Buttons } from "@repo/ui/buttons/scenes";
import { HiOutlineArrowDownTray, HiOutlineClipboardDocumentList, HiOutlinePlusCircle, HiOutlineTrash } from "react-icons/hi2";
import { SkuLookupField } from "@/components/async-combobox/lookup-fields";
import { ActionBar, SectionCard } from "@/components/form-sections";
import { notify } from "@/components/notifications";
import { formatMoney } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import { save_purchase_order_action, supplier_products_action } from "@/server/domains/inventory/purchase-orders/actions";
import { PURCHASE_ORDERS_HREF, type IPurchaseOrderDetail, type IPurchaseOrderOptions, type ISupplierProduct } from "../models/purchase-order.interface";
import { validationPurchaseOrder, type PurchaseOrderValues } from "../schemas/purchase-order.schema";

const toValues = (order?: IPurchaseOrderDetail | null, supplierId?: number | null): PurchaseOrderValues => ({
  supplier_id: order ? String(order.summary.supplier_id) : supplierId ? String(supplierId) : "",
  warehouse_id: order ? String(order.summary.warehouse_id) : "",
  expected_date: order?.summary.expected_date ?? "",
  notes: order?.notes ?? "",
  lines: order ? order.lines.map((l) => ({ sku_id: String(l.sku_id), quantity: String(l.quantity), unit_cost: String(l.unit_cost) }))
    : [{ sku_id: "", quantity: "1", unit_cost: "" }],
});

/**
 * Borrador de orden de compra: proveedor, bodega destino, fecha esperada y productos con su costo.
 * El costo vacío toma el pactado con el proveedor; "Traer productos del proveedor" llena las líneas
 * con lo que surte (cantidad mínima y costo).
 */
export const PurchaseOrderForm = ({ order, options, supplierId }: { order?: IPurchaseOrderDetail | null; options: IPurchaseOrderOptions;
  supplierId?: number | null }) => {
  const t = useTranslations("Administre.purchaseOrder");
  const tf = useTranslations("Administre.purchaseOrder.form");
  const tCommon = useTranslations("Administre.common");
  const router = useRouter();
  const isNew = order == null;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<ISupplierProduct[]>([]);

  const { control, handleSubmit, setError, getValues, formState: { isSubmitting, errors } } = useForm<PurchaseOrderValues>({
    resolver: zodResolver(validationPurchaseOrder()),
    defaultValues: toValues(order, supplierId),
  });
  const { fields, append, remove, replace } = useFieldArray({ control, name: "lines" });
  const values = useWatch({ control }) as PurchaseOrderValues;
  const supplier = options.suppliers.find((s) => String(s.id) === values.supplier_id);

  useEffect(() => {
    if (!values.supplier_id) { setCatalog([]); return; }
    let active = true;
    void supplier_products_action(Number(values.supplier_id)).then((result) => {
      if (active) setCatalog(result.success ? result.data : []);
    });
    return () => { active = false; };
  }, [values.supplier_id]);

  const costOf = useMemo(() => new Map(catalog.map((item) => [String(item.sku_id), item])), [catalog]);

  const total = (values.lines ?? []).reduce((sum, line) => {
    const cost = line.unit_cost ? Number(line.unit_cost) : Number(costOf.get(line.sku_id)?.unit_cost ?? 0);
    return sum + (Number(line.quantity) || 0) * (Number.isFinite(cost) ? cost : 0);
  }, 0);

  const loadCatalog = () => {
    const current = getValues("lines").filter((line) => line.sku_id);
    const present = new Set(current.map((line) => line.sku_id));
    const extra = catalog.filter((item) => !present.has(String(item.sku_id))).map((item) => ({
      sku_id: String(item.sku_id), quantity: String(Math.max(1, item.min_order_qty ?? 1)), unit_cost: item.unit_cost != null ? String(item.unit_cost) : "",
    }));
    replace([...current, ...extra].length > 0 ? [...current, ...extra] : [{ sku_id: "", quantity: "1", unit_cost: "" }]);
  };

  const submit = async (form: PurchaseOrderValues) => {
    setSubmitError(null);
    const result = await save_purchase_order_action(isNew ? null : order!.summary.id, {
      supplier_id: Number(form.supplier_id),
      warehouse_id: Number(form.warehouse_id),
      expected_date: form.expected_date || null,
      notes: form.notes || null,
      lines: form.lines.map((line) => ({ sku_id: Number(line.sku_id), quantity: Number(line.quantity),
        unit_cost: line.unit_cost === "" ? null : Number(line.unit_cost) })),
      lock_version: order?.lock_version ?? null,
    });
    if (!result.success) {
      for (const [field, message] of Object.entries(result.field_errors ?? {})) setError(field as Path<PurchaseOrderValues>, { type: "server", message });
      setSubmitError(result.error);
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    notify.success(isNew ? tCommon("createdSuccess") : tCommon("updatedSuccess"), result.data.summary.number ?? "");
    router.push(`${PURCHASE_ORDERS_HREF}/${result.data.summary.id}`);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(submit)} className='grid gap-6' noValidate>
      <SectionCard id='po-header' icon={HiOutlineClipboardDocumentList} title={tf("header")}
        hint={supplier ? tf("supplierHint", { lead: supplier.lead_time_days ?? "—", min: supplier.min_order_amount ? formatMoney(supplier.min_order_amount) : "—" })
          : tf("headerHint")}>
        <FormSelectField controller={{ control, name: "supplier_id" }} label={t("fields.supplier")} required triggerClassName='!w-full'
          data={options.suppliers.filter((s) => s.status === "ACTIVE" || String(s.id) === values.supplier_id)
            .map((s) => ({ value: String(s.id), label: s.name }))} className='col-span-12 md:col-span-6' />
        <FormSelectField controller={{ control, name: "warehouse_id" }} label={t("fields.warehouse")} required triggerClassName='!w-full'
          data={options.warehouses.map((w) => ({ value: String(w.id), label: w.name }))} className='col-span-12 md:col-span-6' />
        <FormField controller={{ control, name: "expected_date" }} type='date' label={t("fields.expected")} description={tf("expectedHint")}
          className='col-span-12 md:col-span-4' />
        <FormTextAreaField controller={{ control, name: "notes" }} label={tf("notes")} className='col-span-12 md:col-span-8' />
      </SectionCard>

      <SectionCard id='po-lines' icon={HiOutlineClipboardDocumentList} title={tf("lines", { count: fields.length })}
        hint={tf("linesHint", { total: formatMoney(total) })}>
        {fields.map((field, index) => {
          const line = values.lines?.[index];
          const agreed = line ? costOf.get(line.sku_id) : undefined;
          return (
            <div key={field.id} className='col-span-12 grid grid-cols-12 items-end gap-3'>
              <SkuLookupField<PurchaseOrderValues> control={control} name={`lines.${index}.sku_id`} label={t("fields.sku")} required
                className='col-span-12 md:col-span-6' />
              <FormField controller={{ control, name: `lines.${index}.quantity` }} label={tf("quantity")} inputMode='numeric' required
                className='col-span-5 md:col-span-2' />
              <FormField controller={{ control, name: `lines.${index}.unit_cost` }} label={tf("unitCost")} inputMode='decimal'
                description={agreed?.unit_cost != null ? tf("agreedCost", { amount: formatMoney(agreed.unit_cost) }) : undefined}
                className='col-span-5 md:col-span-3' />
              <Buttons type='button' variant='outline' className='col-span-2 rounded-full md:col-span-1' disabled={fields.length === 1}
                onClick={() => remove(index)} aria-label={tf("removeLine")}>
                <HiOutlineTrash className='h-4 w-4' aria-hidden='true' />
              </Buttons>
            </div>
          );
        })}
        {errors.lines?.message ? <p className='col-span-12 text-sm text-destructive'>{errors.lines.message}</p> : null}
        <div className='col-span-12 flex flex-wrap gap-2'>
          <Buttons type='button' variant='outline' className='rounded-full' disabled={fields.length >= 200}
            onClick={() => append({ sku_id: "", quantity: "1", unit_cost: "" })}>
            <HiOutlinePlusCircle className='h-4 w-4' aria-hidden='true' />
            {tf("addLine")}
          </Buttons>
          {catalog.length > 0 ? (
            <Buttons type='button' variant='outline' className='rounded-full' onClick={loadCatalog}>
              <HiOutlineArrowDownTray className='h-4 w-4' aria-hidden='true' />
              {tf("loadCatalog", { count: catalog.length })}
            </Buttons>
          ) : null}
        </div>
      </SectionCard>

      <ActionBar message={submitError ?? undefined}>
        <Link href={isNew ? PURCHASE_ORDERS_HREF : `${PURCHASE_ORDERS_HREF}/${order!.summary.id}`}
          className='inline-flex h-10 items-center rounded-full border border-border px-4 text-sm font-medium hover:bg-muted'>
          {tCommon("cancel")}
        </Link>
        <Buttons type='submit' className='rounded-full' loading={isSubmitting}>{isNew ? tf("saveDraft") : tCommon("save")}</Buttons>
      </ActionBar>
    </form>
  );
};
