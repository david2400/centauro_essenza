/** @format */

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { confirm, notify, prompt } from "@/components/notifications";
import { Modal } from "@repo/ui/modals/scenes/dialog/modal";
import { Buttons } from "@repo/ui/buttons/scenes";
import {
  HiOutlineArrowLeft,
  HiOutlineMapPin,
  HiOutlinePencilSquare,
  HiOutlinePlusCircle,
  HiOutlineSignal,
  HiOutlineTrash,
} from "react-icons/hi2";
import { DataGrid, type GridColumn, type RowAction } from "@/components/data-grid";
import { StatCards } from "@/components/stat-cards";
import { Link } from "@/shared/i18n/routing";
import { ShippingQuote } from "./shipping-quote";
import { daysFromToday, formatDate, formatDateTime } from "../constants";
import type {
  IDispatch,
  IDispatchShipment,
  IDispatchLine,
  IDispatchOrder,
  IDispatchOrderLine,
  IDispatchTracking,
} from "../models/dispatch.interface";
import {
  addDispatchLineServerAction,
  addTrackingServerAction,
  deleteDispatchLineServerAction,
  deleteTrackingServerAction,
} from "@/app/[locale]/logistica/dispatches/actions";
import dynamic from "next/dynamic";
import { FormSkeleton } from "@/components/feedback/form-skeleton";

// Se descargan al abrirse (no viajan con la página).
const UpdateDispatch = dynamic(() => import("./form").then((m) => m.UpdateDispatch), { loading: () => <FormSkeleton /> });

interface IDispatchDetailProps {
  dispatch: IDispatch;
  lines: IDispatchLine[];
  trackings: IDispatchTracking[];
  orderLines: IDispatchOrderLine[];
  shipment: IDispatchShipment | null;
  orders: IDispatchOrder[];
}

export const DispatchDetail = ({
  dispatch,
  lines,
  trackings,
  orderLines,
  shipment,
  orders,
}: IDispatchDetailProps) => {
  const router = useRouter();
  const t = useTranslations("Administre.dispatch");
  const tLines = useTranslations("Administre.dispatch.lines");
  const tTracking = useTranslations("Administre.dispatch.tracking");
  const tCommon = useTranslations("Administre.common");

  const [editing, setEditing] = useState(false);
  const dispatchId = dispatch.id ?? 0;

  const orderLineMap = useMemo(
    () => new Map(orderLines.map((line) => [line.id ?? -1, line])),
    [orderLines],
  );

  const pendingLines = useMemo(() => {
    const included = new Set(lines.map((line) => line.product_order_id));
    return orderLines.filter((line) => line.id != null && !included.has(line.id));
  }, [lines, orderLines]);

  const sortedTrackings = useMemo(
    () => [...trackings].sort((a, b) => (b.id ?? 0) - (a.id ?? 0)),
    [trackings],
  );

  const showError = (message?: string) =>
    notify.error(tCommon("errorTitle"), message || tCommon("unexpectedError"));

  const run = async (action: () => Promise<{ success: boolean; error?: string }>, message = tCommon("updatedSuccess")) => {
    const response = await action();
    if (response.success) {
      notify.success(message);
      router.refresh();
    } else showError(response.error);
  };

  const handleAddLine = async () => {
    const value = await prompt({
      title: tLines("create"),
      confirmLabel: tCommon("save"),
      input: {
        label: tLines("selectRequired"),
        required: true,
        placeholder: tCommon("selectPlaceholder"),
        options: pendingLines.map((line) => ({
          value: String(line.id),
          label: `${line.product_name} × ${line.quantity}`,
        })),
      },
    });
    if (value) {
      await run(() => addDispatchLineServerAction(dispatchId, Number(value)));
    }
  };

  const handleAddAll = () =>
    run(async () => {
      for (const line of pendingLines) {
        const response = await addDispatchLineServerAction(dispatchId, line.id as number);
        if (!response.success) return response;
      }
      return { success: true };
    });

  const confirmDelete = (name: string, action: () => Promise<{ success: boolean; error?: string }>) =>
    confirm({
      title: tCommon("deleteConfirmTitle"),
      description: tCommon("deleteConfirmText", { name }),
      confirmLabel: tCommon("deleteConfirmButton"),
      tone: "danger",
    }).then((ok) => (ok ? run(action, tCommon("deletedSuccess")) : undefined));

  const lineColumns: GridColumn<IDispatchLine>[] = [
    {
      accessorKey: "product_order_id",
      header: tLines("fields.product"),
      meta: { label: tLines("fields.product"), hideable: false },
      cell: ({ row }) => (
        <span className='font-semibold text-foreground'>
          {orderLineMap.get(row.original.product_order_id ?? -1)?.product_name ??
            `#${row.original.product_order_id}`}
        </span>
      ),
    },
    {
      id: "quantity",
      header: tLines("fields.quantity"),
      meta: { label: tLines("fields.quantity"), align: "right" },
      cell: ({ row }) => (
        <span className='tabular-nums'>
          {orderLineMap.get(row.original.product_order_id ?? -1)?.quantity ?? "—"}
        </span>
      ),
    },
  ];

  const lineRowActions = (line: IDispatchLine): RowAction[] => [
    {
      label: tLines("remove"),
      icon: HiOutlineTrash,
      tone: "danger",
      disabled: line.id == null,
      onSelect: () => {
        const name = orderLineMap.get(line.product_order_id ?? -1)?.product_name ?? `#${line.id}`;
        void confirmDelete(name, () => deleteDispatchLineServerAction(line.id as number));
      },
    },
  ];

  const days = daysFromToday(dispatch.estimated_delivery_date);

  const summary = [
    {
      label: t("fields.orderId"),
      value:
        dispatch.order_id != null ? (
          <Link
            href={`/ventas/orders/${dispatch.order_id}`}
            className='text-primary underline-offset-4 hover:underline'>
            #{dispatch.order_id}
          </Link>
        ) : (
          "—"
        ),
    },
    { label: t("fields.estimatedDeliveryDate"), value: formatDate(dispatch.estimated_delivery_date) },
    { label: t("fields.realDeliveryDate"), value: formatDate(dispatch.real_delivery_date) },
    {
      label: t("countdown"),
      value: days == null ? "—" : days >= 0 ? t("dueIn", { days }) : t("overdue", { days: -days }),
    },
  ];

  return (
    <section className='flex w-full flex-col gap-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='space-y-2'>
          <Link
            href='/logistica/dispatches'
            className='inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground'>
            <HiOutlineArrowLeft className='h-4 w-4' aria-hidden='true' />
            {t("backToList")}
          </Link>
          <h2 className='text-xl font-semibold tracking-tight text-foreground'>
            {t("dispatchLabel", { guide: dispatch.guide_number || `#${dispatch.id}` })}
          </h2>
        </div>
        <Buttons variant='outline' onClick={() => setEditing(true)} className='rounded-full'>
          <HiOutlinePencilSquare className='h-4 w-4' aria-hidden='true' />
          {t("editTitle")}
        </Buttons>
      </div>

      <div className='flex flex-col gap-5 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6'>
        <StatCards items={summary} />

        <div className='grid gap-4 lg:grid-cols-2'>
          <div className='rounded-xl border border-border/70 bg-background/60 p-5'>
            <h3 className='inline-flex items-center gap-2 text-base font-semibold text-foreground'>
              <HiOutlineMapPin className='h-5 w-5 text-primary' aria-hidden='true' />
              {t("routeTitle")}
            </h3>
            <dl className='mt-4 grid gap-4 text-sm sm:grid-cols-2'>
              <div>
                <dt className='text-muted-foreground'>{t("originLegend")}</dt>
                <dd className='font-medium text-foreground'>
                  {dispatch.city_origin ?? "—"}, {dispatch.department_origin ?? "—"}
                </dd>
              </div>
              <div>
                <dt className='text-muted-foreground'>{t("destinationLegend")}</dt>
                <dd className='font-medium text-foreground'>
                  {dispatch.city_destination ?? "—"}, {dispatch.department_destination ?? "—"}
                </dd>
              </div>
              <div className='sm:col-span-2'>
                <dt className='text-muted-foreground'>{t("fields.address")}</dt>
                <dd className='font-medium text-foreground'>{dispatch.address || "—"}</dd>
              </div>
            </dl>
          </div>

          <div className='rounded-xl border border-border/70 bg-background/60 p-5'>
            <div className='flex items-center justify-between gap-2'>
              <h3 className='inline-flex items-center gap-2 text-base font-semibold text-foreground'>
                <HiOutlineSignal className='h-5 w-5 text-primary' aria-hidden='true' />
                {tTracking("title")}
              </h3>
              <Buttons
                size='sm'
                variant='outline'
                onClick={() => run(() => addTrackingServerAction(dispatchId))}
                className='rounded-full'>
                <HiOutlinePlusCircle className='h-4 w-4' aria-hidden='true' />
                {tTracking("create")}
              </Buttons>
            </div>
            <p className='mt-1 text-xs text-muted-foreground'>{tTracking("hint")}</p>
            {sortedTrackings.length === 0 ? (
              <p className='mt-4 text-sm text-muted-foreground'>{tTracking("empty")}</p>
            ) : (
              <ol className='mt-4 space-y-2 border-l border-border pl-4'>
                {sortedTrackings.map((tracking) => (
                  <li key={tracking.id} className='flex items-center justify-between gap-2 text-sm'>
                    <span>
                      <span className='font-medium text-foreground'>
                        {tTracking("eventLabel", { id: tracking.id ?? "—" })}
                      </span>{" "}
                      <span className='text-muted-foreground'>· {formatDateTime(tracking.created_at)}</span>
                    </span>
                    <Buttons
                      size='sm'
                      variant='ghost'
                      aria-label={tCommon("deleteAria", { name: tTracking("eventLabel", { id: tracking.id ?? "—" }) })}
                      className='rounded-full text-destructive hover:text-destructive'
                      onClick={() =>
                        tracking.id != null &&
                        confirmDelete(tTracking("eventLabel", { id: tracking.id }), () =>
                          deleteTrackingServerAction(tracking.id as number),
                        )
                      }>
                      <HiOutlineTrash className='h-4 w-4' aria-hidden='true' />
                    </Buttons>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        <div className='grid gap-4 lg:grid-cols-3'>
          <div className='space-y-3 lg:col-span-2'>
            <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
              <div>
                <h3 className='text-base font-semibold text-foreground'>{tLines("title")}</h3>
                <p className='text-sm text-muted-foreground'>
                  {tLines("progress", { included: lines.length, total: orderLines.length })}
                </p>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Buttons
                  size='sm'
                  variant='outline'
                  disabled={pendingLines.length === 0}
                  onClick={handleAddAll}
                  className='rounded-full'>
                  {tLines("addAll")}
                </Buttons>
                <Buttons
                  size='sm'
                  disabled={pendingLines.length === 0}
                  onClick={handleAddLine}
                  className='rounded-full'>
                  <HiOutlinePlusCircle className='h-4 w-4' aria-hidden='true' />
                  {tLines("create")}
                </Buttons>
              </div>
            </div>
            <DataGrid<IDispatchLine>
              mode='client'
              embedded
              id='dispatch-lines'
              caption={tLines("title")}
              data={lines}
              columns={lineColumns}
              getRowId={(line) => String(line.id)}
              searchText={(line) =>
                orderLineMap.get(line.product_order_id ?? -1)?.product_name ?? ""
              }
              rowActions={lineRowActions}
              emptyState={{
                title: tLines("emptyTitle"),
                description: tLines("emptyDescription"),
              }}
            />
          </div>

          <ShippingQuote shipment={shipment} />
        </div>
      </div>

      <Modal size='lg' title={t("editTitle")} open={editing} onOpenChange={setEditing} hideDefaultFooter={true}>
        {editing ? (
          <UpdateDispatch dispatch={dispatch} orders={orders} handleClose={() => setEditing(false)} />
        ) : null}
      </Modal>
    </section>
  );
};
