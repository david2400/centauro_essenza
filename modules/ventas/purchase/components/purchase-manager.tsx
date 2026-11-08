/** @format */

"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { HiOutlineEye, HiOutlinePlusCircle, HiOutlineShoppingBag } from "react-icons/hi2";
import { CrudManager } from "@/components/crud-manager";
import type { GridColumn, GridFilter } from "@/components/data-grid";
import { formatApiDate, formatMoney, formatNumber } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import type { PageResult } from "@/shared/models/pagination";
import { PURCHASES_HREF, PURCHASE_STATUSES, type IPurchaseSummary } from "../models/purchase.interface";
import { PurchaseStatusBadge } from "./purchase-status-badge";

/**
 * Compras multivendedor. Cada compra agrupa un subpedido por vendedor; su estado lo calcula draco
 * a partir de los subpedidos (una compra no figura pagada si solo se pagó una parte).
 */
export const PurchaseManager = ({ page, canManage }: { page: PageResult<IPurchaseSummary>; canManage: boolean }) => {
  const router = useRouter();
  const t = useTranslations("Administre.purchase");
  const tStatuses = useTranslations("Administre.purchase.statuses");
  const tCrud = useTranslations("Crud");

  const columns = useMemo<GridColumn<IPurchaseSummary>[]>(
    () => [
      {
        id: "number",
        header: t("fields.number"),
        meta: { label: t("fields.number"), hideable: false, exportValue: (row) => row.number },
        cell: ({ row }) => (
          <div className='min-w-0'>
            <Link href={`${PURCHASES_HREF}/${row.original.id}`} className='font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline'>
              {row.original.number}
            </Link>
            <p className='truncate text-xs text-muted-foreground'>{formatApiDate(row.original.created_at)}</p>
          </div>
        ),
      },
      {
        id: "customer",
        header: t("fields.customer"),
        meta: { label: t("fields.customer"), exportValue: (row) => row.customer_name },
        cell: ({ row }) => (
          <div className='min-w-0'>
            <p className='truncate'>{row.original.customer_name ?? "—"}</p>
            <p className='truncate text-xs text-muted-foreground'>{row.original.customer_doc_number ?? ""}</p>
          </div>
        ),
      },
      {
        id: "subOrders",
        header: t("fields.subOrders"),
        meta: { label: t("fields.subOrders"), align: "right", exportValue: (row) => row.sub_orders },
        cell: ({ row }) => (
          <span className='tabular-nums'>{t("sellersCount", { orders: formatNumber(row.original.sub_orders), sellers: formatNumber(row.original.sellers) })}</span>
        ),
      },
      {
        id: "total",
        header: t("fields.total"),
        meta: { label: t("fields.total"), align: "right", exportValue: (row) => row.total },
        cell: ({ row }) => <span className='tabular-nums'>{formatMoney(row.original.total)}</span>,
      },
      {
        id: "status",
        header: t("fields.status"),
        meta: { label: t("fields.status"), exportValue: (row) => tStatuses(row.status) },
        cell: ({ row }) => (
          <div className='flex flex-wrap items-center gap-1'>
            <PurchaseStatusBadge status={row.original.status} />
            {row.original.partially_cancelled ? <span className='text-xs text-muted-foreground'>{t("partiallyCancelled")}</span> : null}
          </div>
        ),
      },
    ],
    [t, tStatuses],
  );

  const filters: GridFilter<IPurchaseSummary>[] = [
    { id: "status", label: t("fields.status"), options: PURCHASE_STATUSES.map((status) => ({ value: status, label: tStatuses(status) })) },
  ];

  return (
    <CrudManager<IPurchaseSummary>
      mode='server'
      gridId='compras'
      namespace='Administre.purchase'
      icon={HiOutlineShoppingBag}
      eyebrow={tCrud("domains.sales")}
      page={page}
      columns={columns}
      filters={filters}
      searchPlaceholder={t("searchPlaceholder")}
      rowLabel={(row) => row.number}
      headerActions={
        canManage ? (
          <Link href={`${PURCHASES_HREF}/new`}
            className='inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90'>
            <HiOutlinePlusCircle className='h-4 w-4' aria-hidden='true' />
            {t("create")}
          </Link>
        ) : undefined
      }
      extraRowActions={(row) => [{ label: t("view"), icon: HiOutlineEye, onSelect: () => router.push(`${PURCHASES_HREF}/${row.id}`) }]}
    />
  );
};
