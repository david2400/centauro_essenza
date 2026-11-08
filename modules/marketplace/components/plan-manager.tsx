/** @format */

"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { HiOutlineEye, HiOutlinePencilSquare, HiOutlinePlusCircle, HiOutlineReceiptPercent } from "react-icons/hi2";
import { CrudManager } from "@/components/crud-manager";
import type { GridColumn, GridFilter } from "@/components/data-grid";
import { formatLocalDate, formatNumber } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import type { PageResult } from "@/shared/models/pagination";
import { PLAN_MODALITIES, PLAN_STATUSES, PLANS_HREF, formatCurrency, formatPercent, type IPlan } from "../models/marketplace.interface";
import { PlanStatusBadge } from "./badges";

/** Planes comerciales: cada fila es una versión; solo los borradores se editan. */
export const PlanManager = ({ page, canManage }: { page: PageResult<IPlan>; canManage: boolean }) => {
  const router = useRouter();
  const t = useTranslations("Administre.marketplace.plan");
  const tStatuses = useTranslations("Administre.marketplace.plan.statuses");
  const tModalities = useTranslations("Administre.marketplace.plan.modalities");
  const tCrud = useTranslations("Crud");

  const columns = useMemo<GridColumn<IPlan>[]>(
    () => [
      {
        id: "code",
        header: t("fields.plan"),
        meta: { label: t("fields.plan"), hideable: false, exportValue: (row) => `${row.code} v${row.version}` },
        cell: ({ row }) => (
          <div className='min-w-0'>
            <Link href={`${PLANS_HREF}/${row.original.id}`} className='font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline'>
              {row.original.name}
            </Link>
            <p className='truncate text-xs text-muted-foreground'>{`${row.original.code} · v${row.original.version}`}</p>
          </div>
        ),
      },
      {
        id: "modality",
        header: t("fields.modality"),
        meta: { label: t("fields.modality"), exportValue: (row) => tModalities(row.terms.modality as never) },
        cell: ({ row }) => tModalities(row.original.terms.modality as never),
      },
      {
        id: "fee",
        header: t("fields.monthlyFee"),
        enableSorting: false,
        meta: { label: t("fields.monthlyFee"), align: "right", exportValue: (row) => row.terms.monthly_fee },
        cell: ({ row }) => <span className='tabular-nums'>{row.original.terms.monthly_fee > 0 ? formatCurrency(row.original.terms.monthly_fee, row.original.terms.currency) : "—"}</span>,
      },
      {
        id: "commission",
        header: t("fields.commission"),
        enableSorting: false,
        meta: { label: t("fields.commission"), align: "right", exportValue: (row) => row.terms.commission_percent },
        cell: ({ row }) => (
          <span className='tabular-nums'>
            {[row.original.terms.commission_percent > 0 ? formatPercent(row.original.terms.commission_percent) : null,
              row.original.terms.fixed_fee_per_sale > 0 ? `+ ${formatCurrency(row.original.terms.fixed_fee_per_sale, row.original.terms.currency)}` : null]
              .filter(Boolean).join(" ") || "—"}
          </span>
        ),
      },
      {
        id: "validFrom",
        header: t("fields.validity"),
        meta: { label: t("fields.validity"), exportValue: (row) => `${row.valid_from} ${row.valid_to ?? ""}` },
        cell: ({ row }) => (
          <span className='whitespace-nowrap text-sm'>
            {row.original.valid_to
              ? `${formatLocalDate(row.original.valid_from)} – ${formatLocalDate(row.original.valid_to)}`
              : t("validFromOnly", { date: formatLocalDate(row.original.valid_from) })}
          </span>
        ),
      },
      {
        id: "assignments",
        header: t("fields.openAssignments"),
        enableSorting: false,
        meta: { label: t("fields.openAssignments"), align: "right", exportValue: (row) => row.open_assignments },
        cell: ({ row }) => <span className='tabular-nums'>{formatNumber(row.original.open_assignments)}</span>,
      },
      {
        id: "status",
        header: t("fields.status"),
        meta: { label: t("fields.status"), exportValue: (row) => tStatuses(row.status as never) },
        cell: ({ row }) => <PlanStatusBadge status={row.original.status} />,
      },
    ],
    [t, tModalities, tStatuses],
  );

  const filters: GridFilter<IPlan>[] = [
    { id: "status", label: t("fields.status"), options: PLAN_STATUSES.map((status) => ({ value: status, label: tStatuses(status) })) },
    { id: "modality", label: t("fields.modality"), options: PLAN_MODALITIES.map((modality) => ({ value: modality, label: tModalities(modality) })) },
  ];

  return (
    <CrudManager<IPlan>
      mode='server'
      gridId='planes-comerciales'
      namespace='Administre.marketplace.plan'
      icon={HiOutlineReceiptPercent}
      eyebrow={tCrud("domains.marketplace")}
      page={page}
      columns={columns}
      filters={filters}
      searchPlaceholder={t("searchPlaceholder")}
      rowLabel={(row) => `${row.code} v${row.version}`}
      headerActions={
        canManage ? (
          <Link href={`${PLANS_HREF}/new`}
            className='inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90'>
            <HiOutlinePlusCircle className='h-4 w-4' aria-hidden='true' />
            {t("create")}
          </Link>
        ) : undefined
      }
      extraRowActions={(row) => [
        { label: t("view"), icon: HiOutlineEye, onSelect: () => router.push(`${PLANS_HREF}/${row.id}`) },
        ...(canManage && row.status === "DRAFT"
          ? [{ label: t("edit"), icon: HiOutlinePencilSquare, onSelect: () => router.push(`${PLANS_HREF}/${row.id}/edit`) }]
          : []),
      ]}
    />
  );
};
