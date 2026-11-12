/** @format */

"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  HiOutlineArrowUturnLeft,
  HiOutlineBanknotes,
  HiOutlineClock,
  HiOutlineCreditCard,
  HiOutlineReceiptPercent,
} from "react-icons/hi2";
import { CrudManager } from "@/components/crud-manager";
import type { GridColumn, GridFilter } from "@/components/data-grid";
import { DateRangeFilter } from "@/components/date-range-filter";
import { formatApiDate, formatMoney, formatNumber } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import type { PageResult } from "@/shared/models/pagination";
import { CHANNEL_ICONS, KIND_ICONS } from "@/modules/ventas/paymentMethod/scenes/formPaymentMethod";
import {
  GATEWAY_PROVIDERS,
  PAYMENT_CHANNELS,
  isPaymentChannel,
  isPaymentKind,
  type IPaymentMethod,
} from "@/modules/ventas/paymentMethod/models/paymentMethod.interface";
import { PaymentStatusBadge } from "../scenes/payment-status-badge";
import { usePaymentActions } from "../hooks/usePaymentActions";
import { PAYMENT_STATUSES, type IPayment, type IPaymentsSummary } from "../models/payment.interface";

interface PaymentManagerProps {
  page: PageResult<IPayment>;
  summary: IPaymentsSummary | null;
  methods: IPaymentMethod[];
}

/** Listado de pagos de todas las órdenes: filtros, totales del filtro y desglose por medio. */
export const PaymentManager = ({ page, summary, methods }: PaymentManagerProps) => {
  const t = useTranslations("Administre.payment");
  const tl = useTranslations("Administre.payment.list");
  const tm = useTranslations("Administre.paymentMethod");
  const tCrud = useTranslations("Crud");
  const { rowActions, dialogs } = usePaymentActions();

  const columns = useMemo<GridColumn<IPayment>[]>(
    () => [
      {
        id: "id",
        header: t("fields.paymentReference"),
        meta: { label: t("fields.paymentReference"), hideable: false, exportValue: (row) => row.payment_reference },
        cell: ({ row }) => (
          <div className='min-w-0'>
            <p className='font-mono text-xs font-semibold text-foreground'>{row.original.payment_reference ?? `#${row.original.id}`}</p>
            {row.original.reference || row.original.provider_reference ? (
              <p className='truncate text-xs text-muted-foreground'>{row.original.reference || row.original.provider_reference}</p>
            ) : null}
          </div>
        ),
      },
      {
        id: "orderId",
        header: t("fields.order"),
        meta: { label: t("fields.order"), exportValue: (row) => row.order_id },
        cell: ({ row }) => (
          <Link href={`/ventas/orders/${row.original.order_id}`} className='font-medium text-primary underline-offset-4 hover:underline'>
            {tl("orderLabel", { id: row.original.order_id ?? "—" })}
          </Link>
        ),
      },
      {
        id: "method",
        header: t("fields.method"),
        enableSorting: false,
        meta: { label: t("fields.method"), exportValue: (row) => row.method_name },
        cell: ({ row }) => {
          const Icon = isPaymentKind(row.original.kind) ? KIND_ICONS[row.original.kind] : HiOutlineCreditCard;
          const ChannelIcon = isPaymentChannel(row.original.channel) ? CHANNEL_ICONS[row.original.channel] : null;
          return (
            <span className='inline-flex items-center gap-2 text-sm'>
              <Icon className='h-4 w-4 text-muted-foreground' aria-hidden='true' />
              {row.original.method_name ?? "—"}
              {ChannelIcon ? (
                <ChannelIcon
                  className='h-3.5 w-3.5 text-muted-foreground'
                  aria-hidden='true'
                />
              ) : null}
            </span>
          );
        },
      },
      {
        id: "status",
        header: t("fields.status"),
        meta: { label: t("fields.status"), exportValue: (row) => row.status },
        cell: ({ row }) => <PaymentStatusBadge status={row.original.status} />,
      },
      {
        id: "amount",
        header: t("fields.amount"),
        meta: { label: t("fields.amount"), align: "right", exportValue: (row) => row.amount },
        cell: ({ row }) => (
          <div className='text-right'>
            <p className='font-medium tabular-nums'>{formatMoney(row.original.amount)}</p>
            {(row.original.refunded_amount ?? 0) > 0 ? (
              <p className='text-xs tabular-nums text-destructive'>−{formatMoney(row.original.refunded_amount)}</p>
            ) : null}
          </div>
        ),
      },
      {
        id: "fee",
        header: t("fields.fee"),
        enableSorting: false,
        meta: { label: t("fields.fee"), align: "right", defaultHidden: true, exportValue: (row) => row.fee_amount },
        cell: ({ row }) => <span className='tabular-nums text-muted-foreground'>{formatMoney(row.original.fee_amount)}</span>,
      },
      {
        id: "createdAt",
        header: t("fields.createdAt"),
        meta: { label: t("fields.createdAt"), exportValue: (row) => formatApiDate(row.created_at) },
        cell: ({ row }) => <span className='whitespace-nowrap text-xs text-muted-foreground'>{formatApiDate(row.original.created_at)}</span>,
      },
      {
        id: "approvedAt",
        header: t("fields.approvedAt"),
        meta: { label: t("fields.approvedAt"), defaultHidden: true, exportValue: (row) => formatApiDate(row.approved_at) },
        cell: ({ row }) => <span className='whitespace-nowrap text-xs text-muted-foreground'>{formatApiDate(row.original.approved_at)}</span>,
      },
    ],
    [t, tl],
  );

  const filters: GridFilter<IPayment>[] = [
    { id: "status", label: t("fields.status"), options: PAYMENT_STATUSES.map((value) => ({ value, label: t(`statuses.${value}`) })) },
    {
      id: "methodId",
      label: t("fields.method"),
      options: methods.map((method) => ({ value: String(method.id), label: method.name ?? `#${method.id}` })),
    },
    { id: "channel", label: tm("fields.channel"), options: PAYMENT_CHANNELS.map((value) => ({ value, label: tm(`channels.${value}`) })) },
    { id: "provider", label: tm("fields.provider"), options: GATEWAY_PROVIDERS.map((value) => ({ value, label: tm(`providers.${value}`) })) },
  ];

  const byMethod = summary?.by_method ?? [];
  const maxApproved = Math.max(...byMethod.map((row) => row.approved_amount ?? 0), 1);

  return (
    <>
      <CrudManager<IPayment>
        mode='server'
        gridId='pagos'
        namespace='Administre.payment.list'
        icon={HiOutlineBanknotes}
        eyebrow={tCrud("domains.sales")}
        page={page}
        columns={columns}
        filters={filters}
        editable={false}
        searchPlaceholder={tl("searchPlaceholder")}
        toolbarExtra={<DateRangeFilter />}
        stats={[
          {
            label: tl("approved"),
            value: formatMoney(summary?.approved_amount),
            icon: HiOutlineBanknotes,
            tone: "success",
            hint: tl("count", { count: summary?.count ?? 0 }),
          },
          {
            label: tl("pending"),
            value: formatMoney(summary?.pending_amount),
            icon: HiOutlineClock,
            tone: (summary?.pending_amount ?? 0) > 0 ? "warning" : "default",
          },
          { label: tl("refunded"), value: formatMoney(summary?.refunded_amount), icon: HiOutlineArrowUturnLeft },
          {
            label: tl("net"),
            value: formatMoney(summary?.net_amount),
            icon: HiOutlineReceiptPercent,
            hint: tl("fees", { amount: formatMoney(summary?.fee_amount) }),
          },
        ]}
        rowLabel={(row) => row.payment_reference ?? `#${row.id}`}
        extraRowActions={rowActions}>
        {byMethod.length > 0 ? (
          <section className='rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5'>
            <h3 className='text-sm font-semibold text-foreground'>{tl("byMethod")}</h3>
            <p className='text-xs text-muted-foreground'>{tl("byMethodHint")}</p>
            <ul className='mt-4 grid gap-3 md:grid-cols-2'>
              {byMethod.map((row) => {
                const ChannelIcon = isPaymentChannel(row.channel) ? CHANNEL_ICONS[row.channel] : HiOutlineCreditCard;
                const approved = row.approved_amount ?? 0;
                return (
                  <li key={row.payment_method_id} className='grid gap-1.5'>
                    <div className='flex items-center justify-between gap-2 text-sm'>
                      <span className='inline-flex min-w-0 items-center gap-2'>
                        <ChannelIcon className='h-4 w-4 shrink-0 text-muted-foreground' aria-hidden='true' />
                        <span className='truncate font-medium'>{row.name ?? `#${row.payment_method_id}`}</span>
                        <span className='text-xs text-muted-foreground'>{tl("count", { count: row.count ?? 0 })}</span>
                      </span>
                      <span className='font-semibold tabular-nums'>{formatMoney(approved)}</span>
                    </div>
                    <div className='h-1.5 overflow-hidden rounded-full bg-muted'>
                      <div className='h-full rounded-full bg-primary' style={{ width: `${(approved / maxApproved) * 100}%` }} />
                    </div>
                    {(row.refunded_amount ?? 0) > 0 || (row.fee_amount ?? 0) > 0 ? (
                      <p className='text-xs text-muted-foreground'>
                        {tl("methodDetail", {
                          refunded: formatMoney(row.refunded_amount ?? 0),
                          fees: formatMoney(row.fee_amount ?? 0),
                        })}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {(summary?.by_status ?? []).length > 0 ? (
              <div className='mt-4 flex flex-wrap gap-2 border-t border-border pt-3'>
                {(summary?.by_status ?? []).map((row) => (
                  <span key={row.status} className='inline-flex items-center gap-1.5 text-xs text-muted-foreground'>
                    <PaymentStatusBadge status={row.status} />
                    {formatNumber(row.count ?? 0)} · {formatMoney(row.amount ?? 0)}
                  </span>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}
      </CrudManager>
      {dialogs}
    </>
  );
};
