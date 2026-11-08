/** @format */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import { Buttons } from "@repo/ui/buttons/scenes";
import {
  HiOutlineArrowLeft,
  HiOutlineCheckCircle,
  HiOutlineClipboardDocumentList,
  HiOutlineExclamationTriangle,
  HiOutlineLightBulb,
  HiOutlineTruck,
} from "react-icons/hi2";
import { EmptyBlock, SectionCard } from "@/components/form-sections";
import { notify } from "@/components/notifications";
import { PageHeader } from "@/components/page-header";
import { StatCards } from "@/components/stat-cards";
import { formatMoney, formatNumber } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import { save_purchase_order_action } from "@/server/domains/inventory/purchase-orders/actions";
import {
  PURCHASE_ORDERS_HREF,
  type IPurchaseOrderOptions,
  type IPurchaseSuggestionGroup,
  type IPurchaseSuggestions,
} from "../models/purchase-order.interface";

const INPUT = "h-9 w-24 rounded-lg border border-input bg-background px-2 text-right text-sm tabular-nums";
const groupKey = (group: IPurchaseSuggestionGroup) => `${group.warehouse_id}:${group.supplier_id ?? "-"}`;

/**
 * Sugerencia de compra desde el stock bajo: un bloque por bodega y proveedor sugerido con la
 * cantidad para reponer (editable). "Crear borrador" arma la orden con el costo pactado.
 */
export const PurchaseSuggestions = ({ data, options, warehouseId, canManage }: { data: IPurchaseSuggestions;
  options: IPurchaseOrderOptions; warehouseId: number | null; canManage: boolean }) => {
  const router = useRouter();
  const t = useTranslations("Administre.purchaseOrder.suggestions");
  const tCommon = useTranslations("Administre.common");
  const tCrud = useTranslations("Crud");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const qtyOf = (group: IPurchaseSuggestionGroup, skuId: number, suggested: number) =>
    quantities[`${groupKey(group)}:${skuId}`] ?? String(suggested);

  const groupTotal = (group: IPurchaseSuggestionGroup) => group.lines.reduce((sum, line) => {
    const qty = Number(qtyOf(group, line.sku_id, line.suggested));
    return sum + (Number.isFinite(qty) && qty > 0 && line.unit_cost != null ? qty * line.unit_cost : 0);
  }, 0);

  const createDraft = async (group: IPurchaseSuggestionGroup) => {
    if (group.supplier_id == null) return;
    const lines = group.lines
      .map((line) => ({ sku_id: line.sku_id, quantity: Number(qtyOf(group, line.sku_id, line.suggested)) }))
      .filter((line) => Number.isInteger(line.quantity) && line.quantity > 0);
    if (lines.length === 0) {
      notify.error(tCommon("errorTitle"), t("noLines"));
      return;
    }
    setBusy(groupKey(group));
    const result = await save_purchase_order_action(null, { supplier_id: group.supplier_id, warehouse_id: group.warehouse_id, lines });
    setBusy(null);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    notify.success(t("created"), result.data.summary.number ?? "");
    router.push(`${PURCHASE_ORDERS_HREF}/${result.data.summary.id}`);
  };

  const changeWarehouse = (value: string) => {
    router.push(value ? `${PURCHASE_ORDERS_HREF}/suggestions?warehouseId=${value}` : `${PURCHASE_ORDERS_HREF}/suggestions`);
  };

  const uncoveredLines = data.without_supplier.reduce((sum, group) => sum + group.lines.length, 0);

  return (
    <section className='flex w-full flex-col gap-6'>
      <PageHeader title={t("title")} description={t("description")} icon={HiOutlineLightBulb} eyebrow={tCrud("domains.inventory")}
        actions={
          <div className='flex flex-wrap items-center gap-2'>
            <label className='flex items-center gap-2 text-sm'>
              <span className='text-muted-foreground'>{t("warehouse")}</span>
              <select value={warehouseId ?? ""} onChange={(event) => changeWarehouse(event.target.value)}
                className='h-10 rounded-lg border border-input bg-background px-3 text-sm'>
                <option value=''>{t("allWarehouses")}</option>
                {options.warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </label>
            <Link href={PURCHASE_ORDERS_HREF}
              className='inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:bg-muted'>
              <HiOutlineArrowLeft className='h-4 w-4' aria-hidden='true' />
              {t("back")}
            </Link>
          </div>
        } />

      <StatCards items={[
        { label: t("stats.low"), value: formatNumber(data.low_stock_skus), icon: HiOutlineExclamationTriangle,
          tone: data.low_stock_skus > 0 ? "warning" : "default" },
        { label: t("stats.covered"), value: formatNumber(data.covered_by_open_orders), icon: HiOutlineTruck },
        { label: t("stats.suppliers"), value: formatNumber(data.groups.length), icon: HiOutlineClipboardDocumentList },
        { label: t("stats.uncovered"), value: formatNumber(uncoveredLines), icon: HiOutlineExclamationTriangle,
          tone: uncoveredLines > 0 ? "danger" : "default" },
      ]} />

      {data.truncated ? <p className='rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm'>{t("truncated")}</p> : null}

      {data.groups.length === 0 && data.without_supplier.length === 0 ? (
        <div className='grid grid-cols-12 rounded-2xl border border-border bg-card p-6'>
          <EmptyBlock icon={HiOutlineCheckCircle} title={t("emptyTitle")} description={t("emptyDescription")} />
        </div>
      ) : null}

      {data.groups.map((group) => {
        const key = groupKey(group);
        const total = groupTotal(group);
        const below = group.min_order_amount != null && total < group.min_order_amount;
        return (
          <SectionCard key={key} id={`suggestion-${key}`} icon={HiOutlineClipboardDocumentList}
            title={`${group.supplier_name ?? ""} · ${group.warehouse_name ?? ""}`}
            hint={group.lead_time_days != null ? t("leadTime", { days: group.lead_time_days }) : undefined}
            contentClassName='p-0'
            actions={canManage ? (
              <Buttons type='button' className='rounded-full' loading={busy === key} disabled={busy != null && busy !== key}
                onClick={() => void createDraft(group)}>
                {t("createDraft")}
              </Buttons>
            ) : undefined}>
            <div className='col-span-12 overflow-x-auto'>
              <table className='w-full text-sm'>
                <thead className='bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground'>
                  <tr>
                    <th className='px-4 py-2'>{t("fields.sku")}</th>
                    <th className='px-4 py-2 text-right'>{t("fields.available")}</th>
                    <th className='px-4 py-2 text-right'>{t("fields.onOrder")}</th>
                    <th className='px-4 py-2 text-right'>{t("fields.averageCost")}</th>
                    <th className='px-4 py-2 text-right'>{t("fields.agreedCost")}</th>
                    <th className='px-4 py-2 text-right'>{t("fields.quantity")}</th>
                    <th className='px-4 py-2 text-right'>{t("fields.lineTotal")}</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-border'>
                  {group.lines.map((line) => {
                    const value = qtyOf(group, line.sku_id, line.suggested);
                    const qty = Number(value);
                    return (
                      <tr key={line.sku_id}>
                        <td className='px-4 py-2'>
                          <p className='font-mono text-xs font-semibold'>{line.sku_code ?? `#${line.sku_id}`}</p>
                          <p className='text-xs text-muted-foreground'>{line.product_name ?? ""}{line.supplier_code ? ` · ${line.supplier_code}` : ""}</p>
                        </td>
                        <td className='px-4 py-2 text-right tabular-nums'>{formatNumber(line.available)} / {formatNumber(line.min_threshold)}</td>
                        <td className='px-4 py-2 text-right tabular-nums'>{formatNumber(line.on_order)}</td>
                        <td className='px-4 py-2 text-right tabular-nums'>{line.average_cost != null ? formatMoney(line.average_cost) : "—"}</td>
                        <td className='px-4 py-2 text-right tabular-nums'>{line.unit_cost != null ? formatMoney(line.unit_cost) : "—"}</td>
                        <td className='px-4 py-2 text-right'>
                          <input type='number' min={0} step={1} inputMode='numeric' value={value} aria-label={t("fields.quantity")}
                            disabled={!canManage}
                            onChange={(event) => setQuantities((current) => ({ ...current, [`${key}:${line.sku_id}`]: event.target.value }))}
                            className={INPUT} />
                        </td>
                        <td className='px-4 py-2 text-right tabular-nums'>
                          {line.unit_cost != null && Number.isFinite(qty) && qty > 0 ? formatMoney(qty * line.unit_cost) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className='border-t border-border'>
                    <td colSpan={6} className='px-4 py-3 text-right text-sm font-medium'>
                      {below && group.min_order_amount != null ? (
                        <Badge variant='destructive' className='mr-3'>{t("belowMinimum", { amount: formatMoney(group.min_order_amount) })}</Badge>
                      ) : null}
                      {t("total")}
                    </td>
                    <td className='px-4 py-3 text-right font-semibold tabular-nums'>{formatMoney(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </SectionCard>
        );
      })}

      {data.without_supplier.map((group) => (
        <SectionCard key={groupKey(group)} id={`suggestion-${groupKey(group)}`} icon={HiOutlineExclamationTriangle}
          title={`${t("withoutSupplierTitle")} · ${group.warehouse_name ?? ""}`} hint={t("withoutSupplierHint")} contentClassName='p-0'
          actions={
            <Link href='/inventory/suppliers' className='text-sm font-medium text-primary hover:underline'>{t("goSuppliers")}</Link>
          }>
          <div className='col-span-12 overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead className='bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground'>
                <tr>
                  <th className='px-4 py-2'>{t("fields.sku")}</th>
                  <th className='px-4 py-2 text-right'>{t("fields.available")}</th>
                  <th className='px-4 py-2 text-right'>{t("fields.onOrder")}</th>
                  <th className='px-4 py-2 text-right'>{t("fields.averageCost")}</th>
                  <th className='px-4 py-2 text-right'>{t("fields.quantity")}</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-border'>
                {group.lines.map((line) => (
                  <tr key={line.sku_id}>
                    <td className='px-4 py-2'>
                      <p className='font-mono text-xs font-semibold'>{line.sku_code ?? `#${line.sku_id}`}</p>
                      <p className='text-xs text-muted-foreground'>{line.product_name ?? ""}</p>
                    </td>
                    <td className='px-4 py-2 text-right tabular-nums'>{formatNumber(line.available)} / {formatNumber(line.min_threshold)}</td>
                    <td className='px-4 py-2 text-right tabular-nums'>{formatNumber(line.on_order)}</td>
                    <td className='px-4 py-2 text-right tabular-nums'>{line.average_cost != null ? formatMoney(line.average_cost) : "—"}</td>
                    <td className='px-4 py-2 text-right tabular-nums'>{formatNumber(line.suggested)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ))}
    </section>
  );
};
