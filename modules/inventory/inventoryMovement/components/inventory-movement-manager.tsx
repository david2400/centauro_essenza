/** @format */

"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import {
  HiOutlineArrowDownTray,
  HiOutlineArrowRight,
  HiOutlineArrowsRightLeft,
  HiOutlineArrowUpTray,
  HiOutlineQueueList,
} from "react-icons/hi2";
import { CrudManager } from "@/components/crud-manager";
import type { GridColumn } from "@/components/data-grid";
import type { StatCardItem } from "@/components/stat-cards";
import { formatApiDate, formatNumber } from "@/lib/format";
import type { PageResult } from "@/shared/models/pagination";
import { exportMovementsServerAction } from "@/app/[locale]/inventory/inventory-movements/actions";
import {
  MOVEMENT_TYPES,
  type IInventoryMovementRow,
  type INamedItem,
  REFERENCE_TYPES,
  type MovementType,
} from "../models/inventory-movement.interface";
import dynamic from "next/dynamic";
import { FormSkeleton } from "@/components/feedback/form-skeleton";

// Se descargan al abrirse (no viajan con la página).
const RegisterInventoryMovement = dynamic(() => import("./form").then((m) => m.RegisterInventoryMovement), { loading: () => <FormSkeleton /> });

interface IInventoryMovementManagerProps {
  /** Página del kardex (paginada y ordenada en el backend) con nombres ya resueltos. */
  page: PageResult<IInventoryMovementRow>;
  warehouses: INamedItem[];
}

const TYPE_VARIANT: Record<MovementType, "default" | "secondary" | "outline"> = {
  ENTRY: "default",
  EXIT: "outline",
  TRANSFER: "secondary",
};

const toOptions = (items: INamedItem[]) =>
  items
    .filter((item) => item.id != null)
    .map((item) => ({ id: String(item.id), value: String(item.id), label: item.name ?? `#${item.id}` }));

const productLabel = (row: IInventoryMovementRow) => row.product_name ?? `#${row.product_id}`;

/**
 * Kardex de movimientos (entradas, salidas, traslados): registro inmutable.
 * Modo servidor: cada cambio de página u orden pide solo esa página al backend,
 * así la pantalla carga igual de rápido con cien o con cien mil movimientos.
 */
export const InventoryMovementManager = ({ page, warehouses }: IInventoryMovementManagerProps) => {
  const t = useTranslations("Administre.inventoryMovement");
  const tCrud = useTranslations("Crud");

  const warehouseNames = useMemo(
    () => new Map(warehouses.map((item) => [item.id ?? -1, item.name ?? `#${item.id}`])),
    [warehouses],
  );
  const warehouseOptions = useMemo(() => toOptions(warehouses), [warehouses]);

  const columns = useMemo<GridColumn<IInventoryMovementRow>[]>(() => {
    const warehouseLabel = (id?: number) => (id == null ? "—" : (warehouseNames.get(id) ?? `#${id}`));
    const sourceLabel = (row: IInventoryMovementRow) =>
      row.reference_type && (REFERENCE_TYPES as readonly string[]).includes(row.reference_type)
        ? t(`sources.${row.reference_type as (typeof REFERENCE_TYPES)[number]}`)
        : t("sources.MANUAL");
    const typeLabel = (row: IInventoryMovementRow) =>
      MOVEMENT_TYPES.includes(row.type as MovementType) ? t(`types.${row.type as MovementType}`) : row.type;

    return [
      {
        // El id coincide con el campo de orden del backend (`sort=createdAt,desc`).
        id: "createdAt",
        accessorFn: (row) => row.created_at ?? "",
        header: t("fields.date"),
        meta: { label: t("fields.date"), hideable: false, exportValue: (row) => row.created_at },
        cell: ({ row }) => (
          <span className='whitespace-nowrap text-sm text-muted-foreground'>
            {row.original.created_at ? formatApiDate(row.original.created_at) : "—"}
          </span>
        ),
      },
      {
        id: "type",
        header: t("fields.type"),
        enableSorting: false,
        meta: { label: t("fields.type"), hideable: false, exportValue: (row) => typeLabel(row) },
        cell: ({ row }) => (
          <Badge variant={TYPE_VARIANT[row.original.type as MovementType] ?? "outline"}>{typeLabel(row.original)}</Badge>
        ),
      },
      {
        id: "product",
        header: t("fields.productId"),
        enableSorting: false,
        meta: { label: t("fields.productId"), exportValue: (row) => productLabel(row) },
        cell: ({ row }) => (
          <div className='min-w-0'>
            <span className='font-semibold text-foreground'>{productLabel(row.original)}</span>
            {row.original.sku_code ? (
              <p className='font-mono text-xs text-muted-foreground'>{row.original.sku_code}</p>
            ) : null}
          </div>
        ),
      },
      {
        id: "sku_code",
        header: t("fields.skuId"),
        enableSorting: false,
        // Solo para el CSV: en la tabla el código va bajo el producto.
        meta: { label: t("fields.skuId"), defaultHidden: true, exportValue: (row) => row.sku_code },
        cell: ({ row }) => <span className='font-mono text-xs'>{row.original.sku_code ?? "—"}</span>,
      },
      {
        id: "route",
        header: `${t("fields.fromWarehouseId")} → ${t("fields.toWarehouseId")}`,
        enableSorting: false,
        meta: {
          label: `${t("fields.fromWarehouseId")} → ${t("fields.toWarehouseId")}`,
          exportValue: (row) => `${warehouseLabel(row.from_warehouse_id)} → ${warehouseLabel(row.to_warehouse_id)}`,
        },
        cell: ({ row }) => (
          <span className='inline-flex items-center gap-1.5 text-sm'>
            {warehouseLabel(row.original.from_warehouse_id)}
            <HiOutlineArrowRight className='h-3.5 w-3.5 text-muted-foreground' aria-hidden='true' />
            {warehouseLabel(row.original.to_warehouse_id)}
          </span>
        ),
      },
      {
        id: "quantity",
        accessorFn: (row) => row.quantity ?? 0,
        header: t("fields.quantity"),
        meta: { label: t("fields.quantity"), align: "right", exportValue: (row) => row.quantity },
        cell: ({ row }) => {
          const sign = row.original.type === "ENTRY" ? "+" : row.original.type === "EXIT" ? "−" : "";
          return (
            <span className='font-semibold tabular-nums text-foreground'>
              {sign}
              {formatNumber(row.original.quantity ?? 0)}
            </span>
          );
        },
      },
      {
        id: "source",
        header: t("fields.source"),
        enableSorting: false,
        meta: { label: t("fields.source"), exportValue: (row) => sourceLabel(row) },
        cell: ({ row }) => <Badge variant='outline'>{sourceLabel(row.original)}</Badge>,
      },
      {
        id: "reason",
        header: t("fields.reason"),
        enableSorting: false,
        meta: { label: t("fields.reason"), exportValue: (row) => row.reason },
        cell: ({ row }) => row.original.reason || "—",
      },
    ];
  }, [warehouseNames, t]);

  // El total es real (backend); las unidades por tipo son de la página visible, y así se rotula.
  const stats = useMemo<StatCardItem[]>(() => {
    const sum = (type: MovementType) =>
      page.items.filter((movement) => movement.type === type).reduce((acc, movement) => acc + (movement.quantity ?? 0), 0);
    const onPage = t("onThisPage");
    return [
      { label: t("totalMovements"), value: formatNumber(page.total), icon: HiOutlineQueueList },
      { label: t("entryUnits"), value: formatNumber(sum("ENTRY")), icon: HiOutlineArrowDownTray, tone: "success", hint: onPage },
      { label: t("exitUnits"), value: formatNumber(sum("EXIT")), icon: HiOutlineArrowUpTray, tone: "warning", hint: onPage },
      { label: t("transferUnits"), value: formatNumber(sum("TRANSFER")), icon: HiOutlineArrowsRightLeft, hint: onPage },
    ];
  }, [page.items, page.total, t]);

  return (
    <CrudManager<IInventoryMovementRow>
      mode='server'
      gridId='movimientos-inventario'
      namespace='Administre.inventoryMovement'
      icon={HiOutlineArrowsRightLeft}
      eyebrow={tCrud("domains.inventory")}
      page={page}
      columns={columns}
      // El API de movimientos pagina y ordena, pero aún no busca ni filtra.
      searchable={false}
      editable={false}
      stats={stats}
      rowLabel={productLabel}
      onExportAll={(params) => exportMovementsServerAction(params)}
      renderForm={(_item, close) => <RegisterInventoryMovement handleClose={close} warehouses={warehouseOptions} />}
    />
  );
};
