/** @format */

"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  HiOutlineCheckBadge,
  HiOutlineClipboardDocumentCheck,
  HiOutlineEye,
  HiOutlinePauseCircle,
  HiOutlinePencilSquare,
  HiOutlinePlusCircle,
  HiOutlineTag,
} from "react-icons/hi2";
import { CrudManager } from "@/components/crud-manager";
import type { GridColumn, GridFilter } from "@/components/data-grid";
import { formatNumber } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import type { PageResult } from "@/shared/models/pagination";
import { OFFER_STATUSES, OFFERS_HREF, SELLERS_HREF, formatCurrency, type IOfferStats, type IOfferSummary } from "../models/marketplace.interface";
import { OfferStatusBadge, SellerStatusBadge } from "./badges";

interface IOfferManagerProps {
  page: PageResult<IOfferSummary>;
  stats: IOfferStats | null;
  canManage: boolean;
  /** Vendedor filtrado desde su ficha (se muestra como contexto). */
  sellerName?: string | null;
}

/**
 * Ofertas de vendedores externos. La cola de moderación es el filtro "En moderación"; aprobar o
 * rechazar se hace en la ficha de la oferta (flujo con motivo), no como edición genérica.
 */
export const OfferManager = ({ page, stats, canManage, sellerName }: IOfferManagerProps) => {
  const router = useRouter();
  const t = useTranslations("Administre.marketplace.offer");
  const tStatuses = useTranslations("Administre.marketplace.offer.statuses");
  const tConditions = useTranslations("Administre.marketplace.offer.conditions");
  const tCrud = useTranslations("Crud");

  const columns = useMemo<GridColumn<IOfferSummary>[]>(
    () => [
      {
        id: "productName",
        header: t("fields.product"),
        meta: { label: t("fields.product"), hideable: false, exportValue: (row) => row.product_name },
        cell: ({ row }) => (
          <div className='min-w-0'>
            <Link href={`${OFFERS_HREF}/${row.original.id}`} className='font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline'>
              {row.original.product_name ?? `SKU #${row.original.sku_id}`}
            </Link>
            <p className='truncate text-xs text-muted-foreground'>
              {[row.original.sku_code, tConditions(row.original.condition as never)].filter(Boolean).join(" · ")}
            </p>
          </div>
        ),
      },
      {
        id: "sellerName",
        header: t("fields.seller"),
        meta: { label: t("fields.seller"), exportValue: (row) => row.seller_name },
        cell: ({ row }) => (
          <div className='flex min-w-0 flex-col gap-1'>
            <Link href={`${SELLERS_HREF}/${row.original.seller_id}`} className='truncate hover:text-primary hover:underline'>{row.original.seller_name}</Link>
            {row.original.seller_status !== "APPROVED" ? <SellerStatusBadge status={row.original.seller_status} /> : null}
          </div>
        ),
      },
      {
        id: "price",
        header: t("fields.price"),
        meta: { label: t("fields.price"), align: "right", exportValue: (row) => row.price },
        cell: ({ row }) => <span className='tabular-nums'>{formatCurrency(row.original.price, row.original.currency)}</span>,
      },
      {
        id: "availableQuantity",
        header: t("fields.quantity"),
        meta: { label: t("fields.quantity"), align: "right", exportValue: (row) => row.available_quantity },
        cell: ({ row }) => <span className='tabular-nums'>{formatNumber(row.original.available_quantity)}</span>,
      },
      {
        id: "status",
        header: t("fields.status"),
        meta: { label: t("fields.status"), exportValue: (row) => tStatuses(row.status as never) },
        cell: ({ row }) => <OfferStatusBadge status={row.original.status} />,
      },
    ],
    [t, tConditions, tStatuses],
  );

  const filters: GridFilter<IOfferSummary>[] = [
    { id: "status", label: t("fields.status"), options: OFFER_STATUSES.map((status) => ({ value: status, label: tStatuses(status) })) },
  ];

  return (
    <CrudManager<IOfferSummary>
      mode='server'
      gridId='ofertas'
      namespace='Administre.marketplace.offer'
      icon={HiOutlineTag}
      eyebrow={tCrud("domains.marketplace")}
      page={page}
      columns={columns}
      filters={filters}
      searchPlaceholder={t("searchPlaceholder")}
      stats={
        stats
          ? [
              { label: t("stats.total"), value: formatNumber(stats.total), icon: HiOutlineTag },
              {
                label: t("stats.pending"),
                value: formatNumber(stats.pending_review),
                icon: HiOutlineClipboardDocumentCheck,
                tone: stats.pending_review > 0 ? "warning" : "default",
              },
              { label: t("stats.active"), value: formatNumber(stats.active), icon: HiOutlineCheckBadge, tone: "success" },
              { label: t("stats.paused"), value: formatNumber(stats.paused + stats.rejected), icon: HiOutlinePauseCircle },
            ]
          : undefined
      }
      rowLabel={(row) => row.product_name ?? `#${row.id}`}
      toolbarExtra={sellerName ? (
        <span className='inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs'>
          {t("filteredBySeller", { name: sellerName })}
          <Link href={OFFERS_HREF} className='font-medium text-primary hover:underline'>{t("clearSeller")}</Link>
        </span>
      ) : undefined}
      headerActions={
        canManage ? (
          <Link href={`${OFFERS_HREF}/new`}
            className='inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90'>
            <HiOutlinePlusCircle className='h-4 w-4' aria-hidden='true' />
            {t("create")}
          </Link>
        ) : undefined
      }
      extraRowActions={(row) => [
        { label: t("view"), icon: HiOutlineEye, onSelect: () => router.push(`${OFFERS_HREF}/${row.id}`) },
        ...(canManage && ["DRAFT", "REJECTED", "ACTIVE", "PAUSED"].includes(row.status)
          ? [{ label: t("edit"), icon: HiOutlinePencilSquare, onSelect: () => router.push(`${OFFERS_HREF}/${row.id}/edit`) }]
          : []),
      ]}
    />
  );
};
