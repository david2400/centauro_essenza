/** @format */

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import { Buttons } from "@repo/ui/buttons/scenes";
import {
  HiOutlineCalendarDays,
  HiOutlineCheckBadge,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
  HiOutlineEye,
  HiOutlineShoppingCart,
  HiOutlineTruck,
} from "react-icons/hi2";
import { CrudManager } from "@/components/crud-manager";
import type { GridColumn, GridFilter } from "@/components/data-grid";
import { confirm, notify } from "@/components/notifications";
import { formatApiDate, formatLocalDate, formatMoney, formatNumber } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import type { PageResult } from "@/shared/models/pagination";
import { backfill_dispatch_action } from "@/server/domains/sales/dispatch/actions";
import { ORDERS_HREF } from "@/modules/ventas/order/models/order.interface";
import { OrderStatusBadge } from "@/modules/ventas/order/components/order-status-badge";
import { PURCHASES_HREF } from "@/modules/ventas/purchase/models/purchase.interface";
import { DISPATCH_VIEWS, type DispatchUrgency, type IDispatchRow, type IDispatchStats } from "../models/dispatch.interface";

const URGENCY_VARIANT: Record<DispatchUrgency, "default" | "secondary" | "destructive" | "outline"> = {
  OVERDUE: "destructive",
  DUE_TODAY: "default",
  ON_TIME: "secondary",
  NONE: "outline",
};

interface IDispatchManagerProps {
  page: PageResult<IDispatchRow>;
  stats: IDispatchStats | null;
  canManage: boolean;
}

/**
 * Tablero de despachos por subpedido: lo que falta por despachar (propio y de cada vendedor
 * externo) con su fecha límite, lo vencido, lo que va en camino y el cumplimiento. Despachar y
 * entregar se hace en la ficha de la orden.
 */
export const DispatchManager = ({ page, stats, canManage }: IDispatchManagerProps) => {
  const router = useRouter();
  const t = useTranslations("Administre.dispatchBoard");
  const tCrud = useTranslations("Crud");
  const tCommon = useTranslations("Administre.common");
  const [busy, setBusy] = useState(false);

  const columns = useMemo<GridColumn<IDispatchRow>[]>(
    () => [
      {
        id: "paidAt",
        header: t("fields.order"),
        meta: { label: t("fields.order"), hideable: false, exportValue: (row) => row.order_number ?? row.order_id },
        cell: ({ row }) => (
          <div className='min-w-0'>
            <Link href={`${ORDERS_HREF}/${row.original.order_id}`} className='font-semibold hover:text-primary hover:underline'>
              {row.original.order_number ?? `#${row.original.order_id}`}
            </Link>
            <p className='text-xs text-muted-foreground'>
              {row.original.purchase_id ? (
                <Link href={`${PURCHASES_HREF}/${row.original.purchase_id}`} className='hover:text-primary hover:underline'>
                  {row.original.purchase_number ?? `#${row.original.purchase_id}`}
                </Link>
              ) : null}
              {row.original.purchase_id && row.original.paid_at ? " · " : null}
              {row.original.paid_at ? t("paidOn", { date: formatApiDate(row.original.paid_at) }) : null}
            </p>
          </div>
        ),
      },
      {
        id: "seller",
        header: t("fields.seller"),
        meta: { label: t("fields.seller"), exportValue: (row) => (row.third_party ? row.seller_name : t("ownStore")) },
        cell: ({ row }) => (
          <div className='min-w-0'>
            <p className='truncate'>{row.original.third_party ? row.original.seller_name : t("ownStore")}</p>
            {row.original.third_party ? (
              <p className='text-xs text-muted-foreground'>{row.original.consignment ? t("consignmentShips") : t("sellerShips")}</p>
            ) : null}
          </div>
        ),
      },
      {
        id: "customer",
        header: t("fields.customer"),
        meta: { label: t("fields.customer"), exportValue: (row) => row.customer_name },
        cell: ({ row }) => (
          <div className='min-w-0 text-sm'>
            <p className='truncate'>{row.original.customer_name ?? "—"}</p>
            <p className='truncate text-xs text-muted-foreground'>
              {row.original.delivery_method === "PICKUP" ? t("pickup") : row.original.ship_city ?? "—"}
            </p>
          </div>
        ),
      },
      {
        id: "shipBy",
        header: t("fields.shipBy"),
        meta: { label: t("fields.shipBy"), exportValue: (row) => row.ship_by },
        cell: ({ row }) => (
          <div className='grid gap-1'>
            <span className='text-sm tabular-nums'>{row.original.ship_by ? formatLocalDate(row.original.ship_by) : t("noShipBy")}</span>
            {row.original.urgency !== "NONE" ? (
              <Badge variant={URGENCY_VARIANT[row.original.urgency]} className='w-fit'>
                {row.original.urgency === "OVERDUE"
                  ? t("daysLate", { count: row.original.days_late })
                  : t(`urgency.${row.original.urgency}` as never)}
              </Badge>
            ) : null}
          </div>
        ),
      },
      {
        id: "state",
        header: t("fields.state"),
        meta: { label: t("fields.state"), exportValue: (row) => row.state },
        cell: ({ row }) => <OrderStatusBadge state={row.original.state} />,
      },
      {
        id: "shippedAt",
        header: t("fields.shipment"),
        meta: { label: t("fields.shipment"), exportValue: (row) => row.tracking_number },
        cell: ({ row }) =>
          row.original.shipped_at || row.original.tracking_number ? (
            <div className='min-w-0 text-sm'>
              <p className='truncate'>{row.original.carrier_name ?? t("ownDelivery")}</p>
              <p className='truncate font-mono text-xs text-muted-foreground'>
                {[row.original.tracking_number, row.original.shipped_at ? formatApiDate(row.original.shipped_at) : null]
                  .filter(Boolean).join(" · ")}
              </p>
            </div>
          ) : (
            <span className='text-sm text-muted-foreground'>—</span>
          ),
      },
      {
        id: "total",
        header: t("fields.total"),
        meta: { label: t("fields.total"), align: "right", exportValue: (row) => row.total },
        cell: ({ row }) => <span className='tabular-nums'>{formatMoney(row.original.total)}</span>,
      },
    ],
    [t],
  );

  const filters: GridFilter<IDispatchRow>[] = [
    { id: "view", label: t("filters.view"), options: DISPATCH_VIEWS.map((view) => ({ value: view, label: t(`views.${view}`) })) },
    {
      id: "seller",
      label: t("filters.seller"),
      options: [
        { value: "own", label: t("ownStore") },
        ...(stats?.by_seller ?? [])
          .filter((load) => load.third_party && load.seller_id != null)
          .map((load) => ({ value: String(load.seller_id), label: load.seller_name ?? `#${load.seller_id}` })),
      ],
    },
  ];

  const runBackfill = async () => {
    const ok = await confirm({ title: t("backfill.title"), description: t("backfill.description"), confirmLabel: t("backfill.label") });
    if (!ok) return;
    setBusy(true);
    const result = await backfill_dispatch_action();
    setBusy(false);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    notify.success(t("backfill.done"), t("backfill.result", { count: result.data.updated }));
    router.refresh();
  };

  return (
    <CrudManager<IDispatchRow>
      mode='server'
      gridId='despachos'
      namespace='Administre.dispatchBoard'
      icon={HiOutlineTruck}
      eyebrow={tCrud("domains.sales")}
      page={page}
      columns={columns}
      filters={filters}
      searchPlaceholder={t("searchPlaceholder")}
      stats={
        stats
          ? [
              { label: t("stats.toShip"), value: formatNumber(stats.to_ship), icon: HiOutlineClock },
              {
                label: t("stats.overdue"),
                value: formatNumber(stats.overdue),
                icon: HiOutlineExclamationTriangle,
                tone: stats.overdue > 0 ? "danger" : "default",
                hint: stats.due_today > 0 ? t("stats.dueToday", { count: stats.due_today }) : undefined,
              },
              { label: t("stats.inTransit"), value: formatNumber(stats.in_transit), icon: HiOutlineTruck },
              {
                label: t("stats.onTime"),
                value: stats.on_time_rate == null ? "—" : `${formatNumber(stats.on_time_rate)} %`,
                icon: HiOutlineCheckBadge,
                tone: stats.on_time_rate == null ? "default" : stats.on_time_rate >= 90 ? "success" : "warning",
                hint: t("stats.onTimeHint", { onTime: stats.on_time30, shipped: stats.shipped30, delivered: stats.delivered30 }),
              },
            ]
          : undefined
      }
      rowLabel={(row) => row.order_number ?? `#${row.order_id}`}
      headerActions={
        canManage && stats && stats.without_ship_by > 0 ? (
          <Buttons type='button' variant='outline' className='rounded-full' loading={busy} onClick={() => void runBackfill()}>
            <HiOutlineCalendarDays className='h-4 w-4' aria-hidden='true' />
            {t("backfill.button", { count: stats.without_ship_by })}
          </Buttons>
        ) : undefined
      }
      extraRowActions={(row) => [
        { label: t("viewOrder"), icon: HiOutlineEye, onSelect: () => router.push(`${ORDERS_HREF}/${row.order_id}`) },
        ...(row.purchase_id
          ? [{ label: t("viewPurchase"), icon: HiOutlineShoppingCart, onSelect: () => router.push(`${PURCHASES_HREF}/${row.purchase_id}`) }]
          : []),
      ]}
    />
  );
};
