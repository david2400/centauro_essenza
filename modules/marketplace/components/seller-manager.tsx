/** @format */

"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  HiOutlineBuildingStorefront,
  HiOutlineCheckBadge,
  HiOutlineClipboardDocumentCheck,
  HiOutlineEye,
  HiOutlineNoSymbol,
  HiOutlinePencilSquare,
  HiOutlinePlusCircle,
} from "react-icons/hi2";
import { CrudManager } from "@/components/crud-manager";
import type { GridColumn, GridFilter } from "@/components/data-grid";
import { formatLocalDate, formatNumber } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import type { PageResult } from "@/shared/models/pagination";
import {
  SELLER_KINDS,
  SELLER_STATUSES,
  SELLERS_HREF,
  type ISellerStats,
  type ISellerSummary,
} from "../models/marketplace.interface";
import { SellerStatusBadge } from "./badges";

interface ISellerManagerProps {
  page: PageResult<ISellerSummary>;
  stats: ISellerStats | null;
  canManage: boolean;
}

/**
 * Vendedores: búsqueda, filtros y orden en el servidor; estado, tipo y plan vigente. Las
 * aprobaciones y suspensiones se hacen en la ficha (flujo con motivo), no como edición genérica.
 */
export const SellerManager = ({ page, stats, canManage }: ISellerManagerProps) => {
  const router = useRouter();
  const t = useTranslations("Administre.marketplace.seller");
  const tStatuses = useTranslations("Administre.marketplace.seller.statuses");
  const tKinds = useTranslations("Administre.marketplace.seller.kinds");
  const tCrud = useTranslations("Crud");

  const columns = useMemo<GridColumn<ISellerSummary>[]>(
    () => [
      {
        id: "legalName",
        header: t("fields.seller"),
        meta: { label: t("fields.seller"), hideable: false, exportValue: (row) => row.legal_name },
        cell: ({ row }) => (
          <div className='min-w-0'>
            <Link href={`${SELLERS_HREF}/${row.original.id}`} className='font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline'>
              {row.original.trade_name ?? row.original.legal_name}
            </Link>
            <p className='truncate text-xs text-muted-foreground'>
              {[row.original.trade_name ? row.original.legal_name : null, row.original.code].filter(Boolean).join(" · ")}
            </p>
          </div>
        ),
      },
      {
        id: "kind",
        header: t("fields.kind"),
        meta: { label: t("fields.kind"), exportValue: (row) => tKinds(row.kind as never) },
        cell: ({ row }) => (
          <span className={row.original.kind === "OWN" ? "font-medium text-primary" : undefined}>{tKinds(row.original.kind as never)}</span>
        ),
      },
      {
        id: "document",
        header: t("fields.document"),
        enableSorting: false,
        meta: { label: t("fields.document"), exportValue: (row) => `${row.doc_type} ${row.doc_number}` },
        cell: ({ row }) => <span className='whitespace-nowrap font-mono text-xs tabular-nums'>{`${row.original.doc_type} ${row.original.doc_number}`}</span>,
      },
      {
        id: "city",
        header: t("fields.city"),
        meta: { label: t("fields.city"), exportValue: (row) => row.city },
        cell: ({ row }) => row.original.city ?? "—",
      },
      {
        id: "plan",
        header: t("fields.plan"),
        enableSorting: false,
        meta: {
          label: t("fields.plan"),
          exportValue: (row) => (row.current_plan_code ? `${row.current_plan_code} v${row.current_plan_version}` : ""),
        },
        cell: ({ row }) => (
          <div className='min-w-0 text-sm'>
            <p className='truncate'>
              {row.original.current_plan_code
                ? `${row.original.current_plan_name} (v${row.original.current_plan_version})`
                : row.original.kind === "OWN"
                  ? t("noPlanOwn")
                  : t("noPlan")}
            </p>
            {row.original.scheduled_plan_starts_on ? (
              <p className='truncate text-xs text-muted-foreground'>{t("scheduledFrom", { date: formatLocalDate(row.original.scheduled_plan_starts_on) })}</p>
            ) : null}
          </div>
        ),
      },
      {
        id: "manager",
        header: t("fields.accountManager"),
        enableSorting: false,
        meta: { label: t("fields.accountManager"), exportValue: (row) => row.account_manager_name },
        cell: ({ row }) => row.original.account_manager_name ?? "—",
      },
      {
        id: "status",
        header: t("fields.status"),
        meta: { label: t("fields.status"), exportValue: (row) => tStatuses(row.status as never) },
        cell: ({ row }) => <SellerStatusBadge status={row.original.status} />,
      },
    ],
    [t, tKinds, tStatuses],
  );

  const filters: GridFilter<ISellerSummary>[] = [
    { id: "status", label: t("fields.status"), options: SELLER_STATUSES.map((status) => ({ value: status, label: tStatuses(status) })) },
    { id: "kind", label: t("fields.kind"), options: SELLER_KINDS.map((kind) => ({ value: kind, label: tKinds(kind) })) },
  ];

  return (
    <CrudManager<ISellerSummary>
      mode='server'
      gridId='vendedores'
      namespace='Administre.marketplace.seller'
      icon={HiOutlineBuildingStorefront}
      eyebrow={tCrud("domains.marketplace")}
      page={page}
      columns={columns}
      filters={filters}
      searchPlaceholder={t("searchPlaceholder")}
      stats={
        stats
          ? [
              { label: t("stats.total"), value: formatNumber(stats.total), icon: HiOutlineBuildingStorefront },
              { label: t("stats.approved"), value: formatNumber(stats.approved), icon: HiOutlineCheckBadge, tone: "success" },
              {
                label: t("stats.inReview"),
                value: formatNumber(stats.in_review + stats.changes_requested),
                icon: HiOutlineClipboardDocumentCheck,
                tone: stats.in_review > 0 ? "warning" : "default",
              },
              {
                label: t("stats.suspended"),
                value: formatNumber(stats.suspended),
                icon: HiOutlineNoSymbol,
                tone: stats.suspended > 0 ? "warning" : "default",
              },
            ]
          : undefined
      }
      rowLabel={(row) => row.trade_name ?? row.legal_name}
      headerActions={
        canManage ? (
          <Link href={`${SELLERS_HREF}/new`}
            className='inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90'>
            <HiOutlinePlusCircle className='h-4 w-4' aria-hidden='true' />
            {t("create")}
          </Link>
        ) : undefined
      }
      extraRowActions={(row) => [
        { label: t("view"), icon: HiOutlineEye, onSelect: () => router.push(`${SELLERS_HREF}/${row.id}`) },
        ...(canManage && row.status !== "CLOSED" && row.status !== "IN_REVIEW"
          ? [{ label: t("edit"), icon: HiOutlinePencilSquare, onSelect: () => router.push(`${SELLERS_HREF}/${row.id}/edit`) }]
          : []),
      ]}
    />
  );
};
