/** @format */

"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  HiOutlineArrowPath,
  HiOutlineBanknotes,
  HiOutlineClock,
  HiOutlineDocumentText,
  HiOutlineEye,
  HiOutlineReceiptPercent,
  HiOutlineReceiptRefund,
} from "react-icons/hi2";
import { CrudManager } from "@/components/crud-manager";
import type { GridColumn, GridFilter, RowAction } from "@/components/data-grid";
import { DateRangeFilter } from "@/components/date-range-filter";
import { formatApiDate, formatMoney, formatNumber } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import type { PageResult } from "@/shared/models/pagination";
import { InvoiceStatusBadge } from "./invoice-status-badge";
import { useInvoiceActions } from "../hooks/useInvoiceActions";
import { INVOICE_KINDS, INVOICE_STATUSES, type IBillingSettings, type IInvoice, type IInvoicesSummary } from "../models/invoice.interface";

interface InvoiceManagerProps {
  page: PageResult<IInvoice>;
  summary: IInvoicesSummary | null;
  settings: IBillingSettings | null;
}

/** Facturas y notas crédito: filtros en el servidor, totales del filtro y acciones por documento. */
export const InvoiceManager = ({ page, summary, settings }: InvoiceManagerProps) => {
  const router = useRouter();
  const t = useTranslations("Administre.billing.invoice");
  const tl = useTranslations("Administre.billing.invoice.list");
  const tCrud = useTranslations("Crud");
  const { retry, creditNote } = useInvoiceActions();

  const columns = useMemo<GridColumn<IInvoice>[]>(
    () => [
      {
        id: "number",
        header: t("fields.number"),
        meta: { label: t("fields.number"), hideable: false, exportValue: (row) => row.full_number },
        cell: ({ row }) => (
          <div className='min-w-0'>
            <Link href={`/facturacion/invoices/${row.original.id}`} className='font-mono font-semibold text-primary underline-offset-4 hover:underline'>
              {row.original.full_number}
            </Link>
            <p className='text-xs text-muted-foreground'>{t(`kinds.${row.original.kind === "CREDIT_NOTE" ? "CREDIT_NOTE" : "INVOICE"}`)}</p>
          </div>
        ),
      },
      {
        id: "issuedAt",
        header: t("fields.issuedAt"),
        meta: { label: t("fields.issuedAt"), exportValue: (row) => formatApiDate(row.issued_at) },
        cell: ({ row }) => <span className='whitespace-nowrap text-xs text-muted-foreground'>{formatApiDate(row.original.issued_at)}</span>,
      },
      {
        id: "buyer",
        header: t("fields.buyer"),
        enableSorting: false,
        meta: { label: t("fields.buyer"), exportValue: (row) => row.buyer?.name },
        cell: ({ row }) => (
          <div className='min-w-0'>
            <p className='truncate'>{row.original.buyer?.name}</p>
            <p className='text-xs text-muted-foreground'>
              {row.original.buyer?.doc_type} {row.original.buyer?.doc_number}
              {row.original.buyer?.dv ? `-${row.original.buyer.dv}` : ""}
            </p>
          </div>
        ),
      },
      {
        id: "orderId",
        header: t("fields.order"),
        meta: { label: t("fields.order"), exportValue: (row) => row.order_id },
        // Las facturas de servicios (p. ej. comisiones al vendedor) no salen de una orden.
        cell: ({ row }) => row.original.order_id == null ? <span className='text-muted-foreground'>—</span> : (
          <Link href={`/ventas/orders/${row.original.order_id}`} className='text-primary underline-offset-4 hover:underline'>
            #{row.original.order_id}
          </Link>
        ),
      },
      {
        id: "status",
        header: t("fields.status"),
        meta: { label: t("fields.status"), exportValue: (row) => row.status },
        cell: ({ row }) => <InvoiceStatusBadge status={row.original.status} />,
      },
      {
        id: "tax",
        header: t("fields.tax"),
        enableSorting: false,
        meta: { label: t("fields.tax"), align: "right", exportValue: (row) => row.tax_amount },
        cell: ({ row }) => <span className='tabular-nums text-muted-foreground'>{formatMoney(row.original.tax_amount)}</span>,
      },
      {
        id: "total",
        header: t("fields.total"),
        meta: { label: t("fields.total"), align: "right", exportValue: (row) => row.total },
        cell: ({ row }) => (
          <span className='font-medium tabular-nums'>
            {row.original.kind === "CREDIT_NOTE" ? "−" : ""}
            {formatMoney(row.original.total)}
          </span>
        ),
      },
      {
        id: "cufe",
        header: "CUFE",
        enableSorting: false,
        meta: { label: "CUFE", defaultHidden: true, exportValue: (row) => row.cufe },
        cell: ({ row }) => <span className='font-mono text-xs text-muted-foreground'>{row.original.cufe?.slice(0, 16) ?? "—"}…</span>,
      },
    ],
    [t],
  );

  const filters: GridFilter<IInvoice>[] = [
    { id: "kind", label: t("fields.kind"), options: INVOICE_KINDS.map((value) => ({ value, label: t(`kinds.${value}`) })) },
    { id: "status", label: t("fields.status"), options: INVOICE_STATUSES.map((value) => ({ value, label: t(`statuses.${value}`) })) },
  ];

  const rowActions = (row: IInvoice): RowAction[] => {
    const actions = row.actions ?? [];
    return [
      { label: t("actions.view"), icon: HiOutlineEye, onSelect: () => router.push(`/facturacion/invoices/${row.id}`) },
      ...(actions.includes("retry") ? [{ label: t("actions.retry"), icon: HiOutlineArrowPath, onSelect: () => void retry(row) }] : []),
      ...(actions.includes("credit_note")
        ? [{ label: t("actions.creditNote"), icon: HiOutlineReceiptRefund, tone: "danger" as const, onSelect: () => void creditNote(row) }]
        : []),
    ];
  };

  return (
    <CrudManager<IInvoice>
      mode='server'
      gridId='facturas'
      namespace='Administre.billing.invoice.list'
      icon={HiOutlineDocumentText}
      eyebrow={tCrud("domains.billing")}
      page={page}
      columns={columns}
      filters={filters}
      editable={false}
      searchPlaceholder={tl("searchPlaceholder")}
      toolbarExtra={<DateRangeFilter />}
      stats={[
        { label: tl("invoiced"), value: formatMoney(summary?.invoiced_total), icon: HiOutlineDocumentText, hint: tl("count", { count: summary?.invoices ?? 0 }) },
        {
          label: tl("credited"),
          value: formatMoney(summary?.credited_total),
          icon: HiOutlineReceiptRefund,
          hint: tl("creditNotes", { count: summary?.credit_notes ?? 0 }),
        },
        { label: tl("net"), value: formatMoney(summary?.net_total), icon: HiOutlineBanknotes, tone: "success" },
        {
          label: tl("taxes"),
          value: formatMoney(summary?.tax_total),
          icon: HiOutlineReceiptPercent,
          hint: (summary?.pending ?? 0) > 0 ? tl("pending", { count: formatNumber(summary?.pending ?? 0) }) : undefined,
          tone: (summary?.pending ?? 0) > 0 ? "warning" : "default",
        },
      ]}
      rowLabel={(row) => row.full_number ?? `#${row.id}`}
      extraRowActions={rowActions}>
      {settings && !settings.ready ? (
        <section className='flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm'>
          <p className='flex items-center gap-2 text-amber-800 dark:text-amber-300'>
            <HiOutlineClock className='h-4 w-4 shrink-0' aria-hidden='true' />
            {tl("notReady")}
          </p>
          <Link href='/facturacion/settings' className='font-medium text-primary underline-offset-4 hover:underline'>
            {tl("configure")}
          </Link>
        </section>
      ) : null}
    </CrudManager>
  );
};
