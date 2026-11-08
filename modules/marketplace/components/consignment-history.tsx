/** @format */

"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import { HiOutlineArchiveBox, HiOutlineClipboardDocumentList, HiOutlineEye, HiOutlineListBullet } from "react-icons/hi2";
import { CrudManager } from "@/components/crud-manager";
import type { GridColumn, GridFilter } from "@/components/data-grid";
import { formatApiDate, formatNumber } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import type { PageResult } from "@/shared/models/pagination";
import { SELLERS_HREF } from "../models/marketplace.interface";
import {
  CONSIGNMENT_DOCUMENTS_HREF,
  CONSIGNMENT_DOCUMENT_KINDS,
  CONSIGNMENT_HREF,
  CONSIGNMENT_MOVEMENT_KINDS,
  type IConsignmentDocument,
  type IConsignmentMovement,
  type IConsignmentOptions,
} from "../models/consignment.interface";

const BackToStock = () => {
  const t = useTranslations("Administre.marketplace.consignment");
  return (
    <Link href={CONSIGNMENT_HREF}
      className='inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:bg-muted'>
      <HiOutlineArchiveBox className='h-4 w-4' aria-hidden='true' />
      {t("backToStock")}
    </Link>
  );
};

/** Kardex de consignación: cada entrada y salida con su saldo resultante, documento u orden. */
export const ConsignmentMovementManager = ({ page, options }: { page: PageResult<IConsignmentMovement>; options: IConsignmentOptions }) => {
  const t = useTranslations("Administre.marketplace.consignment");
  const tKinds = useTranslations("Administre.marketplace.consignment.kinds");
  const tCrud = useTranslations("Crud");

  const columns = useMemo<GridColumn<IConsignmentMovement>[]>(
    () => [
      {
        id: "createdAt",
        header: t("fields.date"),
        meta: { label: t("fields.date"), hideable: false, exportValue: (row) => row.created_at },
        cell: ({ row }) => (
          <div className='text-sm'>
            <p>{row.original.created_at ? formatApiDate(row.original.created_at) : "—"}</p>
            <p className='text-xs text-muted-foreground'>{row.original.created_by}</p>
          </div>
        ),
      },
      {
        id: "kind",
        header: t("fields.kind"),
        meta: { label: t("fields.kind"), exportValue: (row) => tKinds(row.kind as never) },
        cell: ({ row }) => <Badge variant={row.original.quantity > 0 ? "secondary" : "outline"}>{tKinds(row.original.kind as never)}</Badge>,
      },
      {
        id: "sku",
        header: t("fields.sku"),
        meta: { label: t("fields.sku"), exportValue: (row) => row.sku_code },
        cell: ({ row }) => (
          <div className='min-w-0'>
            <p className='font-mono text-sm'>{row.original.sku_code}</p>
            <p className='truncate text-xs text-muted-foreground'>{row.original.product_name ?? "—"}</p>
          </div>
        ),
      },
      {
        id: "seller",
        header: t("fields.seller"),
        meta: { label: t("fields.seller"), exportValue: (row) => row.seller_name },
        cell: ({ row }) => (
          <div className='min-w-0 text-sm'>
            <Link href={`${SELLERS_HREF}/${row.original.seller_id}`} className='truncate hover:text-primary hover:underline'>
              {row.original.seller_name}
            </Link>
            <p className='truncate text-xs text-muted-foreground'>{row.original.warehouse_name ?? `#${row.original.warehouse_id}`}</p>
          </div>
        ),
      },
      {
        id: "quantity",
        header: t("fields.quantity"),
        meta: { label: t("fields.quantity"), align: "right", exportValue: (row) => row.quantity },
        cell: ({ row }) => (
          <div className='text-right tabular-nums'>
            <p className={row.original.quantity > 0 ? "font-semibold text-success" : "font-semibold"}>
              {row.original.quantity > 0 ? `+${formatNumber(row.original.quantity)}` : formatNumber(row.original.quantity)}
            </p>
            <p className='text-xs text-muted-foreground'>{t("balance", { count: row.original.balance_after })}</p>
          </div>
        ),
      },
      {
        id: "source",
        header: t("fields.source"),
        meta: { label: t("fields.source"), exportValue: (row) => row.document_number ?? row.order_number },
        cell: ({ row }) =>
          row.original.document_id ? (
            <Link href={`${CONSIGNMENT_DOCUMENTS_HREF}/${row.original.document_id}`} className='font-mono text-sm hover:text-primary hover:underline'>
              {row.original.document_number ?? `#${row.original.document_id}`}
            </Link>
          ) : row.original.order_id ? (
            <Link href={`/ventas/orders/${row.original.order_id}`} className='text-sm hover:text-primary hover:underline'>
              {row.original.order_number ?? `#${row.original.order_id}`}
            </Link>
          ) : (
            <span className='text-sm text-muted-foreground'>—</span>
          ),
      },
    ],
    [t, tKinds],
  );

  const filters: GridFilter<IConsignmentMovement>[] = [
    { id: "kind", label: t("fields.kind"), options: CONSIGNMENT_MOVEMENT_KINDS.map((kind) => ({ value: kind, label: tKinds(kind) })) },
    { id: "sellerId", label: t("fields.seller"), options: options.sellers.map((s) => ({ value: String(s.id), label: s.name })) },
    { id: "warehouseId", label: t("fields.warehouse"), options: options.warehouses.map((w) => ({ value: String(w.id), label: w.name })) },
  ];

  return (
    <CrudManager<IConsignmentMovement>
      mode='server'
      gridId='consignacion-kardex'
      namespace='Administre.marketplace.consignment.movementsPage'
      icon={HiOutlineListBullet}
      eyebrow={tCrud("domains.marketplace")}
      page={page}
      columns={columns}
      filters={filters}
      rowLabel={(row) => `${row.sku_code} · ${row.kind}`}
      headerActions={<BackToStock />}
    />
  );
};

/** Recepciones, devoluciones al vendedor y ajustes de conteo. */
export const ConsignmentDocumentManager = ({ page, options }: { page: PageResult<IConsignmentDocument>; options: IConsignmentOptions }) => {
  const router = useRouter();
  const t = useTranslations("Administre.marketplace.consignment");
  const tKinds = useTranslations("Administre.marketplace.consignment.kinds");
  const tCrud = useTranslations("Crud");

  const columns = useMemo<GridColumn<IConsignmentDocument>[]>(
    () => [
      {
        id: "createdAt",
        header: t("fields.document"),
        meta: { label: t("fields.document"), hideable: false, exportValue: (row) => row.number },
        cell: ({ row }) => (
          <div className='min-w-0'>
            <Link href={`${CONSIGNMENT_DOCUMENTS_HREF}/${row.original.id}`} className='font-mono font-semibold hover:text-primary hover:underline'>
              {row.original.number ?? `#${row.original.id}`}
            </Link>
            <p className='text-xs text-muted-foreground'>{row.original.created_at ? formatApiDate(row.original.created_at) : ""}</p>
          </div>
        ),
      },
      {
        id: "kind",
        header: t("fields.kind"),
        meta: { label: t("fields.kind"), exportValue: (row) => tKinds(row.kind as never) },
        cell: ({ row }) => <Badge variant='outline'>{tKinds(row.original.kind as never)}</Badge>,
      },
      {
        id: "seller",
        header: t("fields.seller"),
        meta: { label: t("fields.seller"), exportValue: (row) => row.seller_name },
        cell: ({ row }) => (
          <div className='min-w-0 text-sm'>
            <p className='truncate'>{row.original.seller_name}</p>
            <p className='truncate text-xs text-muted-foreground'>{row.original.warehouse_name ?? `#${row.original.warehouse_id}`}</p>
          </div>
        ),
      },
      {
        id: "units",
        header: t("fields.units"),
        meta: { label: t("fields.units"), align: "right", exportValue: (row) => row.units },
        cell: ({ row }) => <span className='tabular-nums'>{formatNumber(row.original.units)}</span>,
      },
      {
        id: "reference",
        header: t("fields.reference"),
        meta: { label: t("fields.reference"), exportValue: (row) => row.reference ?? row.notes },
        cell: ({ row }) => (
          <div className='min-w-0 text-sm'>
            <p className='truncate'>{row.original.reference ?? "—"}</p>
            <p className='truncate text-xs text-muted-foreground'>{row.original.created_by_name ?? row.original.created_by}</p>
          </div>
        ),
      },
    ],
    [t, tKinds],
  );

  const filters: GridFilter<IConsignmentDocument>[] = [
    { id: "kind", label: t("fields.kind"), options: CONSIGNMENT_DOCUMENT_KINDS.map((kind) => ({ value: kind, label: tKinds(kind) })) },
    { id: "sellerId", label: t("fields.seller"), options: options.sellers.map((s) => ({ value: String(s.id), label: s.name })) },
  ];

  return (
    <CrudManager<IConsignmentDocument>
      mode='server'
      gridId='consignacion-documentos'
      namespace='Administre.marketplace.consignment.documentsPage'
      icon={HiOutlineClipboardDocumentList}
      eyebrow={tCrud("domains.marketplace")}
      page={page}
      columns={columns}
      filters={filters}
      rowLabel={(row) => row.number ?? `#${row.id}`}
      headerActions={<BackToStock />}
      extraRowActions={(row) => [
        { label: t("view"), icon: HiOutlineEye, onSelect: () => router.push(`${CONSIGNMENT_DOCUMENTS_HREF}/${row.id}`) },
      ]}
    />
  );
};
