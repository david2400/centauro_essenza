/** @format */

"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import {
  HiOutlineArchiveBox,
  HiOutlineBanknotes,
  HiOutlineBuildingStorefront,
  HiOutlineCheckBadge,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
  HiOutlineEye,
  HiOutlinePencilSquare,
  HiOutlinePlusCircle,
  HiOutlinePrinter,
  HiOutlineReceiptPercent,
  HiOutlineShoppingBag,
  HiOutlineTruck,
  HiOutlineXCircle,
} from "react-icons/hi2";
import { CrudManager } from "@/components/crud-manager";
import type { BulkAction, GridColumn, GridFilter } from "@/components/data-grid";
import { confirm, notify, prompt } from "@/components/notifications";
import { formatApiDate, formatLocalDate, formatMoney, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Link } from "@/shared/i18n/routing";
import type { PageResult } from "@/shared/models/pagination";
import { OrderStatusBadge } from "./order-status-badge";
import {
  DELIVERY_METHODS,
  ORDER_CHANNELS,
  ORDER_PRIORITIES,
  ORDER_STATES,
  PAYMENT_STATUSES,
  PERIODS,
  type OrderState,
} from "../constants";
import { ORDERS_HREF, type INamedItem, type IOrder, type IOrderSummary } from "../models/order.interface";
import {
  bulkDeleteOrdersServerAction,
  bulkOrderStatusServerAction,
  deleteOrderServerAction,
  exportOrdersServerAction,
} from "@/app/[locale]/ventas/orders/actions";

interface IOrderManagerProps {
  page: PageResult<IOrder>;
  summary: IOrderSummary | null;
  stores: INamedItem[];
}

const PAYMENT_TONE: Record<string, string> = {
  UNPAID: "text-muted-foreground",
  PARTIAL: "text-amber-700 dark:text-amber-400",
  PAID: "text-emerald-700 dark:text-emerald-400",
  OVERPAID: "text-destructive",
};

/**
 * Órdenes: búsqueda y filtros en el servidor (estado, cobro, canal, tienda, prioridad,
 * entrega, periodo y vencidas), KPIs con los mismos filtros, cambio de estado en lote,
 * CSV, e impresión; alta y edición en página propia.
 */
export const OrderManager = ({ page, summary, stores }: IOrderManagerProps) => {
  const router = useRouter();
  const t = useTranslations("Administre.order");
  const tl = useTranslations("Administre.order.list");
  const tOpt = useTranslations("Administre.order.options");
  const tStates = useTranslations("Administre.order.states");
  const tCommon = useTranslations("Administre.common");
  const tCrud = useTranslations("Crud");

  const label = (row: IOrder) => row.order_number ?? t("orderLabel", { id: row.id ?? "—" });

  const columns = useMemo<GridColumn<IOrder>[]>(
    () => [
      {
        id: "orderNumber",
        header: t("fields.id"),
        meta: { label: t("fields.id"), hideable: false, exportValue: (row) => row.order_number ?? row.id },
        cell: ({ row }) => (
          <div className='min-w-0'>
            <div className='flex items-center gap-1.5'>
              <Link href={`${ORDERS_HREF}/${row.original.id}`} className='font-semibold text-primary underline-offset-4 hover:underline'>
                {label(row.original)}
              </Link>
              {row.original.priority === "URGENT" || row.original.priority === "HIGH" ? (
                <Badge variant={row.original.priority === "URGENT" ? "destructive" : "secondary"}>
                  {tOpt(`priorities.${row.original.priority}`)}
                </Badge>
              ) : null}
            </div>
            <p className='truncate text-xs text-muted-foreground'>{formatApiDate(row.original.created_at)}</p>
          </div>
        ),
      },
      {
        id: "customerName",
        header: tl("customer"),
        meta: { label: tl("customer"), exportValue: (row) => row.customer_name },
        cell: ({ row }) => (
          <div className='min-w-0 max-w-[220px]'>
            <p className='truncate font-medium text-foreground'>{row.original.customer_name ?? tl("noCustomer")}</p>
            <p className='truncate text-xs text-muted-foreground'>
              {row.original.customer_doc_number ?? row.original.customer_phone ?? row.original.customer_email ?? ""}
            </p>
          </div>
        ),
      },
      {
        id: "state",
        header: t("fields.state"),
        meta: { label: t("fields.state"), exportValue: (row) => (row.state ? tStates(row.state as OrderState) : "") },
        cell: ({ row }) => <OrderStatusBadge state={row.original.state} />,
      },
      {
        id: "payment",
        header: tl("payment"),
        enableSorting: false,
        meta: {
          label: tl("payment"),
          exportValue: (row) => (row.payment_status ? tOpt(`paymentStatuses.${row.payment_status as "PAID"}`) : ""),
        },
        cell: ({ row }) => (
          <div className='text-xs'>
            <p className={cn("font-medium", PAYMENT_TONE[row.original.payment_status ?? ""])}>
              {row.original.payment_status ? tOpt(`paymentStatuses.${row.original.payment_status as "PAID"}`) : "—"}
            </p>
            {(row.original.balance_due ?? 0) > 0 && row.original.state !== "CANCELLED" ? (
              <p className='text-muted-foreground'>{tl("balance", { amount: formatMoney(row.original.balance_due ?? 0) })}</p>
            ) : null}
          </div>
        ),
      },
      {
        id: "total",
        header: t("fields.total"),
        meta: { label: t("fields.total"), align: "right", exportValue: (row) => row.total },
        cell: ({ row }) => (
          <div className='text-right'>
            <p className='font-medium tabular-nums'>{formatMoney(row.original.total)}</p>
            <p className='text-xs text-muted-foreground'>{tl("units", { count: formatNumber(row.original.units_count ?? 0) })}</p>
          </div>
        ),
      },
      {
        id: "delivery",
        header: tl("delivery"),
        enableSorting: false,
        meta: {
          label: tl("delivery"),
          exportValue: (row) =>
            row.delivery_method === "PICKUP" ? `${tOpt("deliveryMethods.PICKUP")} ${row.pickup_store_name ?? ""}` : [row.ship_city, row.carrier_name].filter(Boolean).join(" · "),
        },
        cell: ({ row }) => {
          const pickup = row.original.delivery_method === "PICKUP";
          const units = row.original.units_count ?? 0;
          const picked = row.original.picked_units ?? 0;
          return (
            <div className='min-w-0 max-w-[200px] text-xs'>
              <p className='flex items-center gap-1 truncate text-foreground'>
                {pickup ? (
                  <HiOutlineBuildingStorefront className='h-3.5 w-3.5 shrink-0 text-muted-foreground' aria-hidden='true' />
                ) : (
                  <HiOutlineTruck className='h-3.5 w-3.5 shrink-0 text-muted-foreground' aria-hidden='true' />
                )}
                <span className='truncate'>{pickup ? (row.original.pickup_store_name ?? tOpt("deliveryMethods.PICKUP")) : (row.original.ship_city ?? "—")}</span>
              </p>
              {["PAID", "PROCESSING"].includes(row.original.state ?? "") && units > 0 ? (
                <p className='text-muted-foreground'>{tl("picked", { picked, units })}</p>
              ) : row.original.tracking_number ? (
                <p className='truncate font-mono text-muted-foreground'>{row.original.tracking_number}</p>
              ) : row.original.carrier_name ? (
                <p className='truncate text-muted-foreground'>{row.original.carrier_name}</p>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "promisedDate",
        header: t("fields.promisedDate"),
        meta: { label: t("fields.promisedDate"), exportValue: (row) => row.promised_date },
        cell: ({ row }) =>
          row.original.promised_date ? (
            <span className={cn("inline-flex items-center gap-1 whitespace-nowrap text-sm", row.original.overdue ? "font-medium text-destructive" : "text-muted-foreground")}>
              {row.original.overdue ? <HiOutlineExclamationTriangle className='h-4 w-4' aria-hidden='true' /> : null}
              {formatLocalDate(row.original.promised_date)}
            </span>
          ) : (
            <span className='text-muted-foreground'>—</span>
          ),
      },
      {
        id: "channel",
        header: t("fields.channel"),
        meta: { label: t("fields.channel"), exportValue: (row) => (row.channel ? t(`channels.${row.channel as "BACKOFFICE"}`) : "") },
        cell: ({ row }) => (
          <div className='min-w-0 max-w-[160px] text-xs'>
            <p className='truncate text-foreground'>{row.original.channel ? t(`channels.${row.original.channel as "BACKOFFICE"}`) : "—"}</p>
            <p className='truncate text-muted-foreground'>{row.original.store_name ?? row.original.assigned_to ?? ""}</p>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, tl, tOpt, tStates],
  );

  const filters: GridFilter<IOrder>[] = [
    { id: "state", label: t("fields.state"), options: ORDER_STATES.map((state) => ({ value: state, label: tStates(state) })) },
    {
      id: "paymentStatus",
      label: tl("payment"),
      options: PAYMENT_STATUSES.filter((status) => status !== "OVERPAID").map((status) => ({ value: status, label: tOpt(`paymentStatuses.${status}`) })),
    },
    { id: "period", label: tl("period"), options: PERIODS.map((period) => ({ value: period, label: tOpt(`periods.${period}`) })) },
    { id: "channel", label: t("fields.channel"), options: ORDER_CHANNELS.map((channel) => ({ value: channel, label: t(`channels.${channel}`) })) },
    ...(stores.length > 0
      ? [{ id: "storeId", label: t("fields.store"), options: stores.map((store) => ({ value: String(store.id), label: store.name ?? `#${store.id}` })) }]
      : []),
    { id: "deliveryMethod", label: tl("delivery"), options: DELIVERY_METHODS.map((method) => ({ value: method, label: tOpt(`deliveryMethods.${method}`) })) },
    { id: "priority", label: t("fields.priority"), options: ORDER_PRIORITIES.map((priority) => ({ value: priority, label: tOpt(`priorities.${priority}`) })) },
    { id: "overdue", label: tl("overdue"), options: [{ value: "true", label: tl("overdueOnly") }] },
    { id: "origin", label: tl("origin"), options: [{ value: "OWN", label: tl("originOwn") }, { value: "MARKETPLACE", label: tl("originMarketplace") }] },
  ];

  const bulkStatus = async (rows: IOrder[], state: OrderState) => {
    const ids = rows.map((row) => row.id).filter((id): id is number => id != null);
    if (ids.length === 0) return;
    let reason: string | undefined;
    if (state === "CANCELLED") {
      const value = await prompt({
        title: tl("bulkCancelTitle", { count: ids.length }),
        description: tl("bulkCancelText"),
        confirmLabel: t("transitions.CANCELLED"),
        tone: "danger",
        input: { label: t("cancelReason"), multiline: true, required: false },
      });
      if (value === null) return;
      reason = value.trim() || undefined;
    } else {
      const ok = await confirm({
        title: tl("bulkTitle", { count: ids.length, state: tStates(state) }),
        description: state === "PAID" ? t("payCommits") : tl("bulkText"),
        confirmLabel: t(`transitions.${state}`),
      });
      if (!ok) return;
    }
    const result = await bulkOrderStatusServerAction(ids, state, reason);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    const data = result.data;
    if (data && data.failed.length > 0) {
      notify.warning(
        tl("bulkPartial", { ok: data.succeeded, failed: data.failed.length }),
        data.failed.slice(0, 3).map((failure) => `#${failure.id}: ${failure.reason}`).join(" · "),
      );
    } else {
      notify.success(tl("bulkDone", { count: data?.succeeded ?? ids.length, state: tStates(state) }));
    }
    router.refresh();
  };

  const bulkActions: BulkAction<IOrder>[] = [
    { label: t("transitions.PAID"), icon: HiOutlineBanknotes, onAction: (rows) => bulkStatus(rows, "PAID") },
    { label: t("transitions.PROCESSING"), icon: HiOutlineArchiveBox, onAction: (rows) => bulkStatus(rows, "PROCESSING") },
    { label: t("transitions.DELIVERED"), icon: HiOutlineCheckBadge, onAction: (rows) => bulkStatus(rows, "DELIVERED") },
    { label: t("transitions.CANCELLED"), icon: HiOutlineXCircle, tone: "danger", onAction: (rows) => bulkStatus(rows, "CANCELLED") },
  ];

  return (
    <CrudManager<IOrder>
      mode='server'
      gridId='ordenes'
      namespace='Administre.order'
      icon={HiOutlineShoppingBag}
      eyebrow={tCrud("domains.sales")}
      page={page}
      columns={columns}
      filters={filters}
      searchPlaceholder={t("searchPlaceholder")}
      stats={
        summary
          ? [
              {
                label: tl("sales"),
                value: formatMoney(summary.gross_sales ?? 0),
                icon: HiOutlineBanknotes,
                tone: "success",
                hint: (summary.marketplace_sales ?? 0) > 0
                  ? tl("salesSplit", { own: formatMoney(summary.own_sales ?? 0), marketplace: formatMoney(summary.marketplace_sales ?? 0) })
                  : tl("salesHint", { count: formatNumber((summary.count ?? 0) - (summary.cancelled ?? 0)) }),
              },
              { label: t("averageTicket"), value: formatMoney(summary.average_ticket ?? 0), icon: HiOutlineReceiptPercent },
              {
                label: tl("toCollect"),
                value: formatNumber(summary.pending_payment ?? 0),
                icon: HiOutlineClock,
                tone: (summary.pending_payment ?? 0) > 0 ? "warning" : "success",
              },
              {
                label: tl("toDispatch"),
                value: formatNumber((summary.to_prepare ?? 0) + (summary.ready ?? 0)),
                icon: HiOutlineTruck,
                tone: (summary.overdue ?? 0) > 0 ? "danger" : "default",
                hint:
                  (summary.overdue ?? 0) > 0
                    ? tl("overdueHint", { count: summary.overdue ?? 0 })
                    : tl("toDispatchHint", { prepare: summary.to_prepare ?? 0, ready: summary.ready ?? 0 }),
              },
            ]
          : undefined
      }
      rowLabel={label}
      headerActions={
        <Link href={`${ORDERS_HREF}/new`}
          className='inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90'>
          <HiOutlinePlusCircle className='h-4 w-4' aria-hidden='true' />
          {t("create")}
        </Link>
      }
      extraRowActions={(row) => [
        { label: t("viewDetail"), icon: HiOutlineEye, onSelect: () => router.push(`${ORDERS_HREF}/${row.id}`) },
        ...(row.state !== "DELIVERED" && row.state !== "CANCELLED"
          ? [{ label: tl("edit"), icon: HiOutlinePencilSquare, onSelect: () => router.push(`${ORDERS_HREF}/${row.id}/edit`) }]
          : []),
        { label: tl("print"), icon: HiOutlinePrinter, onSelect: () => router.push(`${ORDERS_HREF}/${row.id}/print`) },
      ]}
      extraBulkActions={bulkActions}
      onDelete={(id) => deleteOrderServerAction(id)}
      onBulkDelete={(ids) => bulkDeleteOrdersServerAction(ids)}
      onExportAll={(params) => exportOrdersServerAction(params)}
    />
  );
};
