/** @format */

"use client";

import { useTranslations } from "next-intl";
import { Buttons } from "@repo/ui/buttons/scenes";
import { Badge } from "@repo/ui/badges/scenes/badge";
import { HiOutlinePencilSquare, HiOutlinePlusCircle, HiOutlineTrash } from "react-icons/hi2";
import { DataGrid, type GridColumn, type RowAction } from "@/components/data-grid";
import { formatMoney } from "../../constants";
import type { IDevolutionDetail } from "../../models/devolution.interface";

/** Productos devueltos: tabla y, mientras la devolución está pendiente, agregar, editar o quitar. */
export const DetailLines = ({
  details,
  canEditLines,
  canAdd,
  onAdd,
  onEdit,
  onDelete,
}: {
  details: IDevolutionDetail[];
  canEditLines: boolean;
  /** Queda algo de la orden por devolver. */
  canAdd: boolean;
  onAdd: () => void;
  onEdit: (detail: IDevolutionDetail) => void;
  onDelete: (detail: IDevolutionDetail) => void;
}) => {
  const tf = useTranslations("Administre.devolution.flow");
  const tDetails = useTranslations("Administre.devolution.details");
  const tCommon = useTranslations("Administre.common");

  const detailColumns: GridColumn<IDevolutionDetail>[] = [
    {
      id: "product",
      header: tDetails("fields.productOrderId"),
      meta: { label: tDetails("fields.productOrderId"), hideable: false, exportValue: (row) => row.product_name },
      cell: ({ row }) => (
        <div className='min-w-0'>
          <p className='font-semibold text-foreground'>{row.original.product_name ?? `#${row.original.product_order_id}`}</p>
          <p className='font-mono text-xs text-muted-foreground'>{row.original.sku_code ?? "—"}</p>
          {row.original.observation && row.original.observation !== "-" ? (
            <p className='mt-0.5 text-xs text-muted-foreground'>{row.original.observation}</p>
          ) : null}
        </div>
      ),
    },
    {
      id: "quantity",
      header: tDetails("fields.quantity"),
      meta: { label: tDetails("fields.quantity"), align: "right", exportValue: (row) => row.quantity },
      cell: ({ row }) => <span className='tabular-nums'>{row.original.quantity ?? "—"}</span>,
    },
    {
      id: "received",
      header: tDetails("fields.receivedQuantity"),
      meta: { label: tDetails("fields.receivedQuantity"), align: "right", exportValue: (row) => row.received_quantity },
      cell: ({ row }) => <span className='tabular-nums'>{row.original.received_quantity ?? "—"}</span>,
    },
    {
      id: "condition",
      header: tDetails("fields.condition"),
      meta: { label: tDetails("fields.condition"), exportValue: (row) => row.condition },
      cell: ({ row }) =>
        row.original.condition ? (
          <div className='space-y-1'>
            <span>{tDetails(`conditions.${row.original.condition}` as never)}</span>
            {row.original.restock ? (
              <Badge variant='secondary'>{tf("restocked", { count: row.original.restocked_quantity ?? 0 })}</Badge>
            ) : (
              <Badge variant='outline'>{tf("notRestocked")}</Badge>
            )}
          </div>
        ) : (
          "—"
        ),
    },
    {
      id: "unitPrice",
      header: tDetails("fields.unitPrice"),
      meta: { label: tDetails("fields.unitPrice"), align: "right", exportValue: (row) => row.unit_price },
      cell: ({ row }) => <span className='tabular-nums'>{formatMoney(row.original.unit_price)}</span>,
    },
    {
      id: "fee",
      header: tDetails("fields.restockingFee"),
      meta: { label: tDetails("fields.restockingFee"), align: "right", exportValue: (row) => row.restocking_fee },
      cell: ({ row }) => <span className='tabular-nums'>{formatMoney(row.original.restocking_fee)}</span>,
    },
    {
      id: "refund",
      header: tDetails("fields.refundAmount"),
      meta: { label: tDetails("fields.refundAmount"), align: "right", exportValue: (row) => row.refund_amount },
      cell: ({ row }) => <span className='font-medium tabular-nums'>{formatMoney(row.original.refund_amount)}</span>,
    },
  ];

  const detailRowActions = (detail: IDevolutionDetail): RowAction[] => {
    if (!canEditLines) return [];
    return [
      { label: tCommon("edit"), icon: HiOutlinePencilSquare, onSelect: () => onEdit(detail) },
      {
        label: tCommon("delete"),
        icon: HiOutlineTrash,
        tone: "danger",
        separated: true,
        disabled: detail.id == null || details.length <= 1,
        onSelect: () => onDelete(detail),
      },
    ];
  };

  return (
    <div className='space-y-3'>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h3 className='text-base font-semibold text-foreground'>{tDetails("title")}</h3>
          <p className='text-sm text-muted-foreground'>{canEditLines ? tf("linesEditable") : tf("linesLocked")}</p>
        </div>
        {canEditLines ? (
          <Buttons size='sm' disabled={!canAdd} onClick={onAdd} className='rounded-full'>
            <HiOutlinePlusCircle className='h-4 w-4' aria-hidden='true' />
            {tDetails("create")}
          </Buttons>
        ) : null}
      </div>
      <DataGrid<IDevolutionDetail>
        mode='client'
        embedded
        id='devolution-details'
        caption={tDetails("title")}
        data={details}
        columns={detailColumns}
        getRowId={(detail) => String(detail.id)}
        searchText={(detail) => `${detail.product_name ?? ""} ${detail.sku_code ?? ""}`}
        rowActions={detailRowActions}
        emptyState={{ title: tDetails("emptyTitle"), description: tDetails("emptyDescription") }}
      />
    </div>
  );
};
