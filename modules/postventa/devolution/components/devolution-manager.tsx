/** @format */

"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  HiOutlineArrowPath,
  HiOutlineArrowUturnLeft,
  HiOutlineBanknotes,
  HiOutlineClock,
  HiOutlineEye,
} from "react-icons/hi2";
import { CrudManager } from "@/components/crud-manager";
import type { GridColumn, GridFilter } from "@/components/data-grid";
import { formatApiDate, formatMoney, formatNumber } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import type { PageResult } from "@/shared/models/pagination";
import { DevolutionStatusBadge } from "./devolution-status-badge";
import { DEVOLUTION_STATES } from "../constants";
import type { IDevolution, IDevolutionCatalogs } from "../models/devolution.interface";
import type { DevolutionStats } from "../stats";
import {
  bulkDeleteDevolutionsServerAction,
  deleteDevolutionServerAction,
  exportDevolutionsServerAction,
} from "@/app/[locale]/postventa/devolutions/actions";
import dynamic from "next/dynamic";
import { FormSkeleton } from "@/components/feedback/form-skeleton";
const RequestReturnForm = dynamic(() => import("./request-return-form").then((m) => m.RequestReturnForm), { loading: () => <FormSkeleton /> });

// Se descargan al abrirse (no viajan con la página).
const UpdateDevolution = dynamic(() => import("./form").then((m) => m.UpdateDevolution), { loading: () => <FormSkeleton /> });

interface IDevolutionManagerProps {
  page: PageResult<IDevolution>;
  stats: DevolutionStats;
  catalogs: IDevolutionCatalogs;
}

/** Devoluciones: búsqueda y filtros en el servidor, detalle con flujo, lote y CSV. */
export const DevolutionManager = ({ page, stats, catalogs }: IDevolutionManagerProps) => {
  const router = useRouter();
  const t = useTranslations("Administre.devolution");
  const tStates = useTranslations("Administre.devolution.states");
  const tCrud = useTranslations("Crud");

  const motiveNames = useMemo(
    () => new Map(catalogs.motives.map((item) => [item.id ?? -1, item.name ?? `#${item.id}`])),
    [catalogs.motives],
  );
  const label = (row: IDevolution) => t("devolutionLabel", { id: row.id ?? "—" });

  const columns = useMemo<GridColumn<IDevolution>[]>(
    () => [
      {
        id: "id",
        header: t("fields.id"),
        meta: { label: t("fields.id"), hideable: false, exportValue: (row) => row.id },
        cell: ({ row }) => (
          <Link
            href={`/postventa/devolutions/${row.original.id}`}
            className='font-semibold text-primary underline-offset-4 hover:underline'>
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
        id: "motiveDevolutionId",
        header: t("fields.motiveDevolutionId"),
        enableSorting: false,
        meta: { label: t("fields.motiveDevolutionId"), exportValue: (row) => motiveNames.get(row.motive_devolution_id ?? -1) },
        cell: ({ row }) => motiveNames.get(row.original.motive_devolution_id ?? -1) ?? "—",
      },
      {
        id: "state",
        header: t("fields.state"),
        meta: { label: t("fields.state"), exportValue: (row) => (row.state ? tStates(row.state as never) : "") },
        cell: ({ row }) => <DevolutionStatusBadge state={row.original.state} />,
      },
      {
        id: "totalRefundAmount",
        header: t("fields.totalRefundAmount"),
        meta: { label: t("fields.totalRefundAmount"), align: "right", exportValue: (row) => row.total_refund_amount },
        cell: ({ row }) => <span className='tabular-nums'>{formatMoney(row.original.total_refund_amount)}</span>,
      },
      {
        id: "createdAt",
        header: tCrud("createdAt"),
        meta: { label: tCrud("createdAt"), exportValue: (row) => formatApiDate(row.created_at) },
        cell: ({ row }) => <span className='whitespace-nowrap text-muted-foreground'>{formatApiDate(row.original.created_at)}</span>,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [motiveNames, t, tStates, tCrud],
  );

  const filters: GridFilter<IDevolution>[] = [
    { id: "state", label: t("fields.state"), options: DEVOLUTION_STATES.map((state) => ({ value: state, label: tStates(state) })) },
    {
      id: "motiveDevolutionId",
      label: t("fields.motiveDevolutionId"),
      options: catalogs.motives
        .filter((item) => item.id != null)
        .map((item) => ({ value: String(item.id), label: item.name ?? `#${item.id}` })),
    },
  ];

  return (
    <CrudManager<IDevolution>
      mode='server'
      gridId='devoluciones'
      namespace='Administre.devolution'
      icon={HiOutlineArrowUturnLeft}
      eyebrow={tCrud("domains.aftersales")}
      page={page}
      columns={columns}
      filters={filters}
      searchPlaceholder={t("searchPlaceholder")}
      stats={[
        { label: t("total"), value: formatNumber(stats.total), icon: HiOutlineArrowUturnLeft },
        {
          label: t("pendingCount"),
          value: formatNumber(stats.pending),
          icon: HiOutlineClock,
          tone: stats.pending > 0 ? "warning" : "success",
        },
        { label: t("inProgressCount"), value: formatNumber(stats.inProgress), icon: HiOutlineArrowPath },
        { label: t("refundedTotal"), value: formatMoney(stats.refunded), icon: HiOutlineBanknotes },
      ]}
      modalSize='xl'
      rowLabel={label}
      extraRowActions={(row) => [
        { label: t("view"), icon: HiOutlineEye, onSelect: () => router.push(`/postventa/devolutions/${row.id}`) },
      ]}
      renderForm={(item, close) =>
        item ? (
          <UpdateDevolution devolution={item} catalogs={catalogs} handleClose={close} />
        ) : (
          <RequestReturnForm catalogs={catalogs} handleClose={close} />
        )
      }
      onDelete={(id) => deleteDevolutionServerAction(id)}
      onBulkDelete={(ids) => bulkDeleteDevolutionsServerAction(ids)}
      onExportAll={(params) => exportDevolutionsServerAction(params)}
    />
  );
};
