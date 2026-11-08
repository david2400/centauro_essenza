/** @format */

"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import { HiOutlineClipboardDocumentList, HiOutlineClock, HiOutlineEye, HiOutlineExclamationTriangle, HiOutlineLightBulb, HiOutlinePlusCircle, HiOutlineTruck } from "react-icons/hi2";
import { CrudManager } from "@/components/crud-manager";
import type { GridColumn, GridFilter } from "@/components/data-grid";
import { formatApiDate, formatLocalDate, formatMoney, formatNumber } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import type { PageResult } from "@/shared/models/pagination";
import { PURCHASE_ORDERS_HREF, PURCHASE_ORDER_FILTERS, PURCHASE_STATUS_VARIANT, type IPurchaseOrderStats, type IPurchaseOrderSummary } from "../models/purchase-order.interface";

/** Órdenes de compra a proveedores: estado, fecha esperada, lo recibido y el total. */
export const PurchaseOrderManager = ({ page, stats, canManage }: { page: PageResult<IPurchaseOrderSummary>; stats: IPurchaseOrderStats | null;
  canManage: boolean }) => {
  const router = useRouter();
  const t = useTranslations("Administre.purchaseOrder");
  const tStatus = useTranslations("Administre.purchaseOrder.statuses");
  const tCrud = useTranslations("Crud");

  const columns = useMemo<GridColumn<IPurchaseOrderSummary>[]>(
    () => [
      {
        id: "createdAt",
        header: t("fields.order"),
        meta: { label: t("fields.order"), hideable: false, exportValue: (row) => row.number },
        cell: ({ row }) => (
          <div className='min-w-0'>
            <Link href={`${PURCHASE_ORDERS_HREF}/${row.original.id}`} className='font-mono font-semibold hover:text-primary hover:underline'>
              {row.original.number ?? `#${row.original.id}`}
            </Link>
            <p className='text-xs text-muted-foreground'>{row.original.created_at ? formatApiDate(row.original.created_at) : ""}</p>
          </div>
        ),
      },
      {
        id: "supplier",
        header: t("fields.supplier"),
        meta: { label: t("fields.supplier"), exportValue: (row) => row.supplier_name },
        cell: ({ row }) => (
          <div className='min-w-0 text-sm'>
            <Link href={`/inventory/suppliers/${row.original.supplier_id}`} className='truncate hover:text-primary hover:underline'>
              {row.original.supplier_name}
            </Link>
            <p className='truncate text-xs text-muted-foreground'>{row.original.warehouse_name ?? "—"}</p>
          </div>
        ),
      },
      {
        id: "expectedDate",
        header: t("fields.expected"),
        meta: { label: t("fields.expected"), exportValue: (row) => row.expected_date },
        cell: ({ row }) => (
          <div className='grid gap-1 text-sm'>
            <span className='tabular-nums'>{row.original.expected_date ? formatLocalDate(row.original.expected_date) : "—"}</span>
            {row.original.overdue ? <Badge variant='destructive' className='w-fit'>{t("overdue")}</Badge> : null}
          </div>
        ),
      },
      {
        id: "received",
        header: t("fields.received"),
        meta: { label: t("fields.received"), align: "right", exportValue: (row) => row.received_units },
        cell: ({ row }) => (
          <span className='tabular-nums'>{formatNumber(row.original.received_units)} / {formatNumber(row.original.ordered_units)}</span>
        ),
      },
      {
        id: "total",
        header: t("fields.total"),
        meta: { label: t("fields.total"), align: "right", exportValue: (row) => row.total },
        cell: ({ row }) => <span className='tabular-nums'>{formatMoney(row.original.total)}</span>,
      },
      {
        id: "status",
        header: t("fields.status"),
        meta: { label: t("fields.status"), exportValue: (row) => tStatus(row.status) },
        cell: ({ row }) => <Badge variant={PURCHASE_STATUS_VARIANT[row.original.status] ?? "outline"}>{tStatus(row.original.status)}</Badge>,
      },
    ],
    [t, tStatus],
  );

  const filters: GridFilter<IPurchaseOrderSummary>[] = [
    { id: "status", label: t("fields.status"), options: PURCHASE_ORDER_FILTERS.map((value) => ({ value, label: t(`filters.${value}` as never) })) },
  ];

  return (
    <CrudManager<IPurchaseOrderSummary>
      mode='server'
      gridId='ordenes-compra'
      namespace='Administre.purchaseOrder'
      icon={HiOutlineClipboardDocumentList}
      eyebrow={tCrud("domains.inventory")}
      page={page}
      columns={columns}
      filters={filters}
      searchPlaceholder={t("searchPlaceholder")}
      stats={stats ? [
        { label: t("stats.open"), value: formatNumber(stats.open), icon: HiOutlineTruck, hint: t("stats.partial", { count: stats.partially_received }) },
        { label: t("stats.overdue"), value: formatNumber(stats.overdue), icon: HiOutlineExclamationTriangle, tone: stats.overdue > 0 ? "warning" : "default" },
        { label: t("stats.drafts"), value: formatNumber(stats.drafts), icon: HiOutlineClock },
        { label: t("stats.received30"), value: formatMoney(stats.purchased30), icon: HiOutlineClipboardDocumentList,
          hint: t("stats.units30", { count: stats.received_units30 }) },
      ] : undefined}
      rowLabel={(row) => row.number ?? `#${row.id}`}
      headerActions={
        <div className='flex flex-wrap items-center gap-2'>
          <Link href={`${PURCHASE_ORDERS_HREF}/suggestions`}
            className='inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:bg-muted'>
            <HiOutlineLightBulb className='h-4 w-4' aria-hidden='true' />
            {t("suggestions.open")}
          </Link>
          {canManage ? (
            <Link href={`${PURCHASE_ORDERS_HREF}/new`}
              className='inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90'>
              <HiOutlinePlusCircle className='h-4 w-4' aria-hidden='true' />
              {t("create")}
            </Link>
          ) : null}
        </div>
      }
      extraRowActions={(row) => [{ label: t("view"), icon: HiOutlineEye, onSelect: () => router.push(`${PURCHASE_ORDERS_HREF}/${row.id}`) }]}
    />
  );
};
