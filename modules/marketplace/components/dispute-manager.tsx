/** @format */

"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import { HiOutlineChatBubbleLeftRight, HiOutlineCheckBadge, HiOutlineClock, HiOutlineExclamationTriangle, HiOutlineEye, HiOutlineScale } from "react-icons/hi2";
import { CrudManager } from "@/components/crud-manager";
import type { GridColumn, GridFilter } from "@/components/data-grid";
import { formatApiDate, formatLocalDate, formatMoney, formatNumber } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import type { PageResult } from "@/shared/models/pagination";
import { SELLERS_HREF } from "../models/marketplace.interface";
import { DISPUTES_HREF, DISPUTE_FILTERS, DISPUTE_STATUS_VARIANT, type IDisputeStats, type IDisputeSummary } from "../models/dispute.interface";

/** Reclamos de compradores contra vendedores externos: plazo del vendedor, estado y decisión. */
export const DisputeManager = ({ page, stats }: { page: PageResult<IDisputeSummary>; stats: IDisputeStats | null }) => {
  const router = useRouter();
  const t = useTranslations("Administre.marketplace.dispute");
  const tStatus = useTranslations("Administre.marketplace.dispute.statuses");
  const tReason = useTranslations("Administre.marketplace.dispute.reasons");
  const tCrud = useTranslations("Crud");

  const columns = useMemo<GridColumn<IDisputeSummary>[]>(
    () => [
      {
        id: "createdAt",
        header: t("fields.dispute"),
        meta: { label: t("fields.dispute"), hideable: false, exportValue: (row) => row.number },
        cell: ({ row }) => (
          <div className='min-w-0'>
            <Link href={`${DISPUTES_HREF}/${row.original.id}`} className='font-mono font-semibold hover:text-primary hover:underline'>
              {row.original.number ?? `#${row.original.id}`}
            </Link>
            <p className='text-xs text-muted-foreground'>{row.original.created_at ? formatApiDate(row.original.created_at) : ""}</p>
          </div>
        ),
      },
      {
        id: "order",
        header: t("fields.order"),
        meta: { label: t("fields.order"), exportValue: (row) => row.order_number },
        cell: ({ row }) => (
          <div className='min-w-0 text-sm'>
            <Link href={`/ventas/orders/${row.original.order_id}`} className='hover:text-primary hover:underline'>
              {row.original.order_number ?? `#${row.original.order_id}`}
            </Link>
            <p className='truncate text-xs text-muted-foreground'>{row.original.customer_name ?? "—"}</p>
          </div>
        ),
      },
      {
        id: "seller",
        header: t("fields.seller"),
        meta: { label: t("fields.seller"), exportValue: (row) => row.seller_name },
        cell: ({ row }) => (
          <Link href={`${SELLERS_HREF}/${row.original.seller_id}`} className='truncate text-sm hover:text-primary hover:underline'>
            {row.original.seller_name}
          </Link>
        ),
      },
      {
        id: "reason",
        header: t("fields.reason"),
        meta: { label: t("fields.reason"), exportValue: (row) => tReason(row.reason) },
        cell: ({ row }) => (
          <div className='text-sm'>
            <p>{tReason(row.original.reason)}</p>
            {row.original.claimed_amount != null ? (
              <p className='text-xs tabular-nums text-muted-foreground'>{formatMoney(row.original.claimed_amount)}</p>
            ) : null}
          </div>
        ),
      },
      {
        id: "respondBy",
        header: t("fields.respondBy"),
        meta: { label: t("fields.respondBy"), exportValue: (row) => row.respond_by },
        cell: ({ row }) => (
          <div className='grid gap-1 text-sm'>
            <span className='tabular-nums'>{formatLocalDate(row.original.respond_by)}</span>
            {row.original.overdue ? <Badge variant='destructive' className='w-fit'>{t("overdue")}</Badge> : null}
          </div>
        ),
      },
      {
        id: "status",
        header: t("fields.status"),
        meta: { label: t("fields.status"), exportValue: (row) => tStatus(row.status) },
        cell: ({ row }) => (
          <div className='grid gap-1'>
            <Badge variant={DISPUTE_STATUS_VARIANT[row.original.status] ?? "outline"} className='w-fit'>{tStatus(row.original.status)}</Badge>
            {row.original.resolution_amount ? (
              <span className='text-xs tabular-nums text-muted-foreground'>{formatMoney(row.original.resolution_amount)}</span>
            ) : null}
          </div>
        ),
      },
    ],
    [t, tStatus, tReason],
  );

  const filters: GridFilter<IDisputeSummary>[] = [
    { id: "status", label: t("fields.status"), options: DISPUTE_FILTERS.map((value) => ({ value, label: t(`filters.${value}` as never) })) },
  ];

  return (
    <CrudManager<IDisputeSummary>
      mode='server'
      gridId='reclamos'
      namespace='Administre.marketplace.dispute'
      icon={HiOutlineScale}
      eyebrow={tCrud("domains.marketplace")}
      page={page}
      columns={columns}
      filters={filters}
      searchPlaceholder={t("searchPlaceholder")}
      stats={stats ? [
        { label: t("stats.open"), value: formatNumber(stats.open), icon: HiOutlineChatBubbleLeftRight },
        { label: t("stats.overdue"), value: formatNumber(stats.overdue), icon: HiOutlineExclamationTriangle,
          tone: stats.overdue > 0 ? "danger" : "default" },
        { label: t("stats.awaiting"), value: formatNumber(stats.awaiting_decision), icon: HiOutlineClock,
          tone: stats.awaiting_decision > 0 ? "warning" : "default" },
        { label: t("stats.resolved"), value: formatNumber(stats.resolved_buyer30 + stats.resolved_seller30), icon: HiOutlineCheckBadge,
          hint: t("stats.resolvedHint", { buyer: stats.resolved_buyer30, seller: stats.resolved_seller30, charged: formatMoney(stats.charged30) }) },
      ] : undefined}
      rowLabel={(row) => row.number ?? `#${row.id}`}
      extraRowActions={(row) => [{ label: t("view"), icon: HiOutlineEye, onSelect: () => router.push(`${DISPUTES_HREF}/${row.id}`) }]}
    />
  );
};
