/** @format */

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Modal } from "@repo/ui/modals/scenes/dialog/modal";
import { Buttons } from "@repo/ui/buttons/scenes";
import {
  HiOutlineAdjustmentsHorizontal,
  HiOutlineArchiveBox,
  HiOutlineArrowDownTray,
  HiOutlineArrowUturnLeft,
  HiOutlineBuildingStorefront,
  HiOutlineClipboardDocumentList,
  HiOutlineExclamationTriangle,
  HiOutlineListBullet,
  HiOutlineLockClosed,
} from "react-icons/hi2";
import { CrudManager } from "@/components/crud-manager";
import type { GridColumn, GridFilter } from "@/components/data-grid";
import { notify } from "@/components/notifications";
import { formatApiDate, formatNumber } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import type { PageResult } from "@/shared/models/pagination";
import { adjust_consignment_action } from "@/server/domains/marketplace/consignment/actions";
import { OFFERS_HREF, SELLERS_HREF } from "../models/marketplace.interface";
import {
  CONSIGNMENT_DOCUMENTS_HREF,
  CONSIGNMENT_HREF,
  CONSIGNMENT_MOVEMENTS_HREF,
  type IConsignmentOptions,
  type IConsignmentStats,
  type IConsignmentStockRow,
} from "../models/consignment.interface";

interface IConsignmentManagerProps {
  page: PageResult<IConsignmentStockRow>;
  stats: IConsignmentStats | null;
  options: IConsignmentOptions;
  canManage: boolean;
}

/**
 * Mercancía de vendedores externos guardada en bodegas propias: saldo por vendedor, SKU y bodega,
 * lo reservado en ventas pendientes y la oferta que la vende. Recibir, devolver al vendedor y
 * ajustar el conteo actualizan el disponible de su oferta con despacho de la plataforma.
 */
export const ConsignmentManager = ({ page, stats, options, canManage }: IConsignmentManagerProps) => {
  const router = useRouter();
  const t = useTranslations("Administre.marketplace.consignment");
  const tCrud = useTranslations("Crud");
  const tCommon = useTranslations("Administre.common");
  const [adjusting, setAdjusting] = useState<IConsignmentStockRow | null>(null);
  const [count, setCount] = useState({ counted: "", reason: "" });
  const [busy, setBusy] = useState(false);

  const columns = useMemo<GridColumn<IConsignmentStockRow>[]>(
    () => [
      {
        id: "skuCode",
        header: t("fields.sku"),
        meta: { label: t("fields.sku"), hideable: false, exportValue: (row) => row.sku_code },
        cell: ({ row }) => (
          <div className='min-w-0'>
            <p className='font-mono font-semibold'>{row.original.sku_code}</p>
            <p className='truncate text-xs text-muted-foreground'>{row.original.product_name ?? "—"}</p>
          </div>
        ),
      },
      {
        id: "sellerName",
        header: t("fields.seller"),
        meta: { label: t("fields.seller"), exportValue: (row) => row.seller_name },
        cell: ({ row }) => (
          <Link href={`${SELLERS_HREF}/${row.original.seller_id}`} className='truncate hover:text-primary hover:underline'>
            {row.original.seller_name}
          </Link>
        ),
      },
      {
        id: "warehouse",
        header: t("fields.warehouse"),
        meta: { label: t("fields.warehouse"), exportValue: (row) => row.warehouse_name },
        cell: ({ row }) => <span className='text-sm'>{row.original.warehouse_name ?? `#${row.original.warehouse_id}`}</span>,
      },
      {
        id: "onHand",
        header: t("fields.onHand"),
        meta: { label: t("fields.onHand"), align: "right", exportValue: (row) => row.on_hand },
        cell: ({ row }) => <span className='font-semibold tabular-nums'>{formatNumber(row.original.on_hand)}</span>,
      },
      {
        id: "available",
        header: t("fields.available"),
        meta: { label: t("fields.available"), align: "right", exportValue: (row) => row.available },
        cell: ({ row }) => (
          <div className='text-right tabular-nums'>
            <p>{formatNumber(row.original.available)}</p>
            {row.original.reserved > 0 ? (
              <p className='text-xs text-muted-foreground'>{t("reservedLine", { count: row.original.reserved })}</p>
            ) : null}
          </div>
        ),
      },
      {
        id: "offer",
        header: t("fields.offer"),
        meta: { label: t("fields.offer"), exportValue: (row) => row.offer_id },
        cell: ({ row }) =>
          row.original.offer_id ? (
            <div className='min-w-0 text-sm'>
              <Link href={`${OFFERS_HREF}/${row.original.offer_id}`} className='hover:text-primary hover:underline'>
                {t("offerLabel", { id: row.original.offer_id })}
              </Link>
              <p className={row.original.offer_fulfillment === "PLATFORM" ? "text-xs text-muted-foreground" : "text-xs text-warning"}>
                {row.original.offer_fulfillment === "PLATFORM" ? t("offerPlatform") : t("offerSeller")}
              </p>
            </div>
          ) : (
            <span className='text-xs text-warning'>{t("noOffer")}</span>
          ),
      },
      {
        id: "firstReceivedAt",
        header: t("fields.custody"),
        meta: { label: t("fields.custody"), exportValue: (row) => row.first_received_at },
        cell: ({ row }) => (
          <div className='text-sm'>
            <p>{row.original.days_in_custody != null ? t("days", { count: row.original.days_in_custody }) : "—"}</p>
            <p className='text-xs text-muted-foreground'>
              {row.original.last_movement_at ? t("lastMove", { date: formatApiDate(row.original.last_movement_at) }) : null}
            </p>
          </div>
        ),
      },
    ],
    [t],
  );

  const filters: GridFilter<IConsignmentStockRow>[] = [
    { id: "sellerId", label: t("fields.seller"), options: options.sellers.map((s) => ({ value: String(s.id), label: s.name })) },
    { id: "warehouseId", label: t("fields.warehouse"), options: options.warehouses.map((w) => ({ value: String(w.id), label: w.name })) },
  ];

  const openAdjust = (row: IConsignmentStockRow) => {
    setCount({ counted: String(row.on_hand), reason: "" });
    setAdjusting(row);
  };

  const submitAdjust = async () => {
    if (!adjusting) return;
    setBusy(true);
    const result = await adjust_consignment_action({
      seller_id: adjusting.seller_id,
      warehouse_id: adjusting.warehouse_id,
      sku_id: adjusting.sku_id,
      counted_quantity: Number(count.counted),
      reason: count.reason,
    });
    setBusy(false);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    notify.success(t("adjust.done"), result.data.number ?? "");
    setAdjusting(null);
    router.refresh();
  };

  return (
    <>
      <CrudManager<IConsignmentStockRow>
        mode='server'
        gridId='consignacion'
        namespace='Administre.marketplace.consignment'
        icon={HiOutlineArchiveBox}
        eyebrow={tCrud("domains.marketplace")}
        page={page}
        columns={columns}
        filters={filters}
        searchPlaceholder={t("searchPlaceholder")}
        stats={
          stats
            ? [
                { label: t("stats.units"), value: formatNumber(stats.units), icon: HiOutlineArchiveBox,
                  hint: t("stats.unitsHint", { skus: stats.skus, sellers: stats.sellers, warehouses: stats.warehouses }) },
                { label: t("stats.reserved"), value: formatNumber(stats.reserved_units), icon: HiOutlineLockClosed },
                {
                  label: t("stats.withoutOffer"),
                  value: formatNumber(stats.without_platform_offer),
                  icon: HiOutlineExclamationTriangle,
                  tone: stats.without_platform_offer > 0 ? "warning" : "default",
                  hint: t("stats.withoutOfferHint"),
                },
                { label: t("stats.sellers"), value: formatNumber(stats.sellers), icon: HiOutlineBuildingStorefront },
              ]
            : undefined
        }
        rowLabel={(row) => `${row.sku_code} · ${row.seller_name}`}
        headerActions={
          <div className='flex flex-wrap gap-2'>
            <Link href={CONSIGNMENT_MOVEMENTS_HREF}
              className='inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:bg-muted'>
              <HiOutlineListBullet className='h-4 w-4' aria-hidden='true' />
              {t("movements")}
            </Link>
            <Link href={CONSIGNMENT_DOCUMENTS_HREF}
              className='inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:bg-muted'>
              <HiOutlineClipboardDocumentList className='h-4 w-4' aria-hidden='true' />
              {t("documents")}
            </Link>
            {canManage ? (
              <>
                <Link href={`${CONSIGNMENT_HREF}/new?kind=RETURN_TO_SELLER`}
                  className='inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:bg-muted'>
                  <HiOutlineArrowUturnLeft className='h-4 w-4' aria-hidden='true' />
                  {t("returnToSeller")}
                </Link>
                <Link href={`${CONSIGNMENT_HREF}/new?kind=RECEIPT`}
                  className='inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90'>
                  <HiOutlineArrowDownTray className='h-4 w-4' aria-hidden='true' />
                  {t("receive")}
                </Link>
              </>
            ) : null}
          </div>
        }
        extraRowActions={(row) => [
          {
            label: t("viewMovements"),
            icon: HiOutlineListBullet,
            onSelect: () => router.push(`${CONSIGNMENT_MOVEMENTS_HREF}?sellerId=${row.seller_id}&skuId=${row.sku_id}`),
          },
          ...(canManage ? [{ label: t("adjust.label"), icon: HiOutlineAdjustmentsHorizontal, onSelect: () => openAdjust(row) }] : []),
        ]}
      />

      <Modal size='md' title={t("adjust.title")} open={adjusting != null} onOpenChange={(open) => !open && setAdjusting(null)}
        hideDefaultFooter={true}>
        {adjusting ? (
          <form className='grid gap-4' onSubmit={(event) => { event.preventDefault(); void submitAdjust(); }}>
            <p className='text-sm text-muted-foreground'>
              {t("adjust.description", { sku: adjusting.sku_code, seller: adjusting.seller_name,
                warehouse: adjusting.warehouse_name ?? `#${adjusting.warehouse_id}`, onHand: adjusting.on_hand })}
            </p>
            <label className='grid gap-1.5 text-sm'>
              <span className='font-medium text-foreground'>{t("adjust.counted")}</span>
              <input type='number' min={0} step={1} required value={count.counted} inputMode='numeric'
                onChange={(event) => setCount({ ...count, counted: event.target.value })}
                className='h-10 rounded-lg border border-input bg-background px-3 text-sm tabular-nums' />
            </label>
            <label className='grid gap-1.5 text-sm'>
              <span className='font-medium text-foreground'>{t("adjust.reason")}</span>
              <textarea required minLength={5} maxLength={500} rows={2} value={count.reason}
                onChange={(event) => setCount({ ...count, reason: event.target.value })}
                className='rounded-lg border border-input bg-background px-3 py-2 text-sm' />
            </label>
            <div className='flex justify-end gap-2'>
              <Buttons type='button' variant='outline' className='rounded-full' onClick={() => setAdjusting(null)}>
                {tCommon("cancel")}
              </Buttons>
              <Buttons type='submit' className='rounded-full' loading={busy}>{t("adjust.label")}</Buttons>
            </div>
          </form>
        ) : null}
      </Modal>
    </>
  );
};
