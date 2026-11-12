/** @format */

"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import {
  HiOutlineCalendarDays,
  HiOutlineEye,
  HiOutlineMapPin,
  HiOutlinePaperAirplane,
} from "react-icons/hi2";
import { CrudManager } from "@/components/crud-manager";
import type { GridColumn, GridFilter } from "@/components/data-grid";
import { formatLocalDate, formatNumber } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import type { PageResult } from "@/shared/models/pagination";
import { daysFromToday } from "../constants";
import type { IDispatch, IDispatchOrder } from "../models/dispatch.interface";
import {
  bulkDeleteDispatchesServerAction,
  deleteDispatchServerAction,
  exportDispatchesServerAction,
} from "@/app/[locale]/logistica/dispatches/actions";
import dynamic from "next/dynamic";
import { FormSkeleton } from "@/components/feedback/form-skeleton";

// Se descargan al abrirse (no viajan con la página).
const RegisterDispatch = dynamic(() => import("./form").then((m) => m.RegisterDispatch), { loading: () => <FormSkeleton /> });
const UpdateDispatch = dynamic(() => import("./form").then((m) => m.UpdateDispatch), { loading: () => <FormSkeleton /> });

interface IDispatchManagerProps {
  page: PageResult<IDispatch>;
  /** Todos los despachos, solo con lo que usan los KPIs y el filtro de ciudad (la tabla va paginada). */
  all: Pick<IDispatch, "estimated_delivery_date" | "city_destination">[];
  orders: IDispatchOrder[];
}

/** Despachos: búsqueda y filtros en el servidor, alertas de entrega, lote y CSV. */
export const DispatchManager = ({ page, all, orders }: IDispatchManagerProps) => {
  const router = useRouter();
  const t = useTranslations("Administre.dispatch");
  const tCrud = useTranslations("Crud");

  const label = (row: IDispatch) => row.guide_number || `#${row.id}`;

  const stats = useMemo(() => {
    const dueSoon = all.filter((item) => {
      const days = daysFromToday(item.estimated_delivery_date);
      return days != null && days >= 0 && days <= 7;
    }).length;
    const cities = new Set(all.map((item) => item.city_destination?.trim().toLowerCase()).filter(Boolean));
    return { total: all.length, dueSoon, cities: cities.size };
  }, [all]);

  const columns = useMemo<GridColumn<IDispatch>[]>(
    () => [
      {
        id: "guideNumber",
        header: t("fields.guideNumber"),
        meta: { label: t("fields.guideNumber"), hideable: false, exportValue: (row) => row.guide_number },
        cell: ({ row }) => (
          <Link
            href={`/logistica/dispatches/${row.original.id}`}
            className='font-mono text-sm font-semibold text-primary underline-offset-4 hover:underline'>
            {label(row.original)}
          </Link>
        ),
      },
      {
        id: "orderId",
        header: t("fields.orderId"),
        meta: { label: t("fields.orderId"), exportValue: (row) => row.order_id },
        cell: ({ row }) =>
          row.original.order_id != null ? (
            <Link href={`/ventas/orders/${row.original.order_id}`} className='underline-offset-4 hover:underline'>
              #{row.original.order_id}
            </Link>
          ) : (
            "—"
          ),
      },
      {
        id: "cityDestination",
        header: t("fields.route"),
        meta: {
          label: t("fields.route"),
          exportValue: (row) => `${row.city_origin ?? ""} → ${row.city_destination ?? ""}`,
        },
        cell: ({ row }) => (
          <span className='inline-flex items-center gap-1.5'>
            <HiOutlineMapPin className='h-4 w-4 text-muted-foreground' aria-hidden='true' />
            {row.original.city_origin ?? "—"} → {row.original.city_destination ?? "—"}
          </span>
        ),
      },
      {
        id: "estimatedDeliveryDate",
        header: t("fields.estimatedDeliveryDate"),
        meta: { label: t("fields.estimatedDeliveryDate"), exportValue: (row) => row.estimated_delivery_date },
        cell: ({ row }) => {
          const days = daysFromToday(row.original.estimated_delivery_date);
          return (
            <span className='inline-flex items-center gap-2 whitespace-nowrap'>
              {formatLocalDate(row.original.estimated_delivery_date)}
              {days != null && days >= 0 && days <= 7 ? <Badge variant='secondary'>{t("dueIn", { days })}</Badge> : null}
            </span>
          );
        },
      },
      {
        id: "realDeliveryDate",
        header: t("fields.realDeliveryDate"),
        meta: { label: t("fields.realDeliveryDate"), exportValue: (row) => row.real_delivery_date },
        cell: ({ row }) => <span className='whitespace-nowrap'>{formatLocalDate(row.original.real_delivery_date)}</span>,
      },
      {
        id: "address",
        header: t("fields.address"),
        enableSorting: false,
        meta: { label: t("fields.address"), defaultHidden: true, exportValue: (row) => row.address },
        cell: ({ row }) => row.original.address || "—",
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  );

  const cityOptions = useMemo(
    () =>
      [...new Set(all.map((item) => item.city_destination).filter((city): city is string => Boolean(city)))]
        .sort((a, b) => a.localeCompare(b, "es"))
        .map((city) => ({ value: city, label: city })),
    [all],
  );

  const filters: GridFilter<IDispatch>[] = [{ id: "cityDestination", label: t("fields.cityDestination"), options: cityOptions }];

  return (
    <CrudManager<IDispatch>
      mode='server'
      gridId='despachos'
      namespace='Administre.dispatch'
      icon={HiOutlinePaperAirplane}
      eyebrow={tCrud("domains.logistics")}
      page={page}
      columns={columns}
      filters={filters}
      searchPlaceholder={t("searchPlaceholder")}
      stats={[
        { label: t("total"), value: formatNumber(stats.total), icon: HiOutlinePaperAirplane },
        {
          label: t("dueSoonCount"),
          value: formatNumber(stats.dueSoon),
          icon: HiOutlineCalendarDays,
          tone: stats.dueSoon > 0 ? "warning" : "default",
        },
        { label: t("citiesCount"), value: formatNumber(stats.cities), icon: HiOutlineMapPin },
      ]}
      rowLabel={label}
      extraRowActions={(row) => [
        { label: t("view"), icon: HiOutlineEye, onSelect: () => router.push(`/logistica/dispatches/${row.id}`) },
      ]}
      renderForm={(item, close) =>
        item ? <UpdateDispatch dispatch={item} orders={orders} handleClose={close} /> : <RegisterDispatch orders={orders} handleClose={close} />
      }
      onDelete={(id) => deleteDispatchServerAction(id)}
      onBulkDelete={(ids) => bulkDeleteDispatchesServerAction(ids)}
      onExportAll={(params) => exportDispatchesServerAction(params)}
    />
  );
};
