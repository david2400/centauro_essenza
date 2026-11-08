/** @format */

"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Modal } from "@repo/ui/modals/scenes/dialog/modal";
import { Buttons } from "@repo/ui/buttons/scenes";
import { Badge } from "@repo/ui/badges/scenes/badge";
import {
  HiOutlineArchiveBox,
  HiOutlineArrowLeft,
  HiOutlineBanknotes,
  HiOutlineBuildingStorefront,
  HiOutlineCalendarDays,
  HiOutlineCheck,
  HiOutlineClipboardDocumentCheck,
  HiOutlineInformationCircle,
  HiOutlineMinus,
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlinePlusCircle,
  HiOutlinePrinter,
  HiOutlineShoppingCart,
  HiOutlineTrash,
  HiOutlineTruck,
  HiOutlineUser,
  HiOutlineXCircle,
} from "react-icons/hi2";
import { KpiStrip, SectionCard } from "@/components/form-sections";
import { confirm, notify, prompt } from "@/components/notifications";
import { formatApiDate, formatLocalDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Link } from "@/shared/i18n/routing";
import { CUSTOMERS_HREF } from "@/modules/ventas/customer/models/customer.interface";
import { OrderItemForm } from "./form";
import { OrderStatusBadge } from "./order-status-badge";
import { OrderTimeline } from "./order-timeline";
import { formatMoney, isOrderState, ORDER_STATES, type OrderState } from "../constants";
import {
  ORDERS_HREF,
  type INamedItem,
  type IOrder,
  type IOrderEvent,
  type IOrderItem,
  type IOrderReservation,
} from "../models/order.interface";
import {
  changeOrderStatusServerAction,
  deleteOrderItemServerAction,
  deliverOrderServerAction,
  pickAllOrderServerAction,
  pickOrderServerAction,
  readyOrderServerAction,
  shipOrderServerAction,
} from "@/app/[locale]/ventas/orders/actions";

interface IOrderDetailProps {
  order: IOrder;
  items: IOrderItem[];
  reservations: IOrderReservation[];
  warehouses: INamedItem[];
  carriers: INamedItem[];
  events: IOrderEvent[];
  /** Bloque de pagos de la orden (lo compone la página). */
  payments?: ReactNode;
  /** Bloque de facturación electrónica (lo compone la página). */
  invoices?: ReactNode;
  /** Bloque de devoluciones de la orden (lo arma la página con el módulo de postventa). */
  returns?: ReactNode;
  /** Aviso bajo el encabezado (p. ej. subpedido de una compra multivendedor). */
  notice?: ReactNode;
  /** Cliente registrado con el documento de la orden (null si aún no está; undefined si no se consultó). */
  customerProfileId?: number | null;
}

const RESERVATION_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "secondary",
  COMMITTED: "default",
  RELEASED: "outline",
  EXPIRED: "destructive",
  RETURNED: "outline",
};

const PAYMENT_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  UNPAID: "outline",
  PARTIAL: "secondary",
  PAID: "default",
  OVERPAID: "destructive",
};

/**
 * Vista 360° de la orden: avance del flujo, cliente, entrega, origen, productos con
 * preparación y reservas, importes, pagos, facturas, devoluciones y línea de tiempo,
 * con las acciones que permite su estado.
 */
export const OrderDetail = ({ order, items, reservations, warehouses, carriers, events, payments, invoices, returns, notice, customerProfileId }: IOrderDetailProps) => {
  const router = useRouter();
  const t = useTranslations("Administre.order");
  const td = useTranslations("Administre.order.detail");
  const tItems = useTranslations("Administre.order.items");
  const tStates = useTranslations("Administre.order.states");
  const tOpt = useTranslations("Administre.order.options");
  const tCommon = useTranslations("Administre.common");

  const [itemModal, setItemModal] = useState<{ open: boolean; item: IOrderItem | null }>({ open: false, item: null });
  const [shipOpen, setShipOpen] = useState(false);
  const [ship, setShip] = useState({ carrier_id: order.carrier_id != null ? String(order.carrier_id) : "", tracking: order.tracking_number ?? "", note: "" });
  const [busy, setBusy] = useState(false);

  const id = order.id!;
  const state = isOrderState(order.state) ? order.state : undefined;
  const pending = state === "PENDING";
  /** Los productos de un subpedido de vendedor externo salen de su oferta: no se editan aquí. */
  const linesEditable = pending && !order.third_party_sale;
  const managed = Boolean(order.stock_managed);
  const pickup = order.delivery_method === "PICKUP";
  const preparing = state === "PAID" || state === "PROCESSING";
  const units = items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
  const picked = items.reduce((sum, item) => sum + Math.min(item.picked_quantity ?? 0, item.quantity ?? 0), 0);
  const allPicked = items.length > 0 && picked >= units;
  const editable = state !== "DELIVERED" && state !== "CANCELLED";
  const next = new Set(order.next_states ?? []);

  const warehouseNames = useMemo(
    () => new Map(warehouses.map((warehouse) => [warehouse.id ?? -1, warehouse.name ?? `#${warehouse.id}`])),
    [warehouses],
  );
  const reservationsByLine = useMemo(() => {
    const map = new Map<number, IOrderReservation[]>();
    reservations.forEach((reservation) => {
      if (reservation.quantity === 0) return;
      map.set(reservation.line_id ?? -1, [...(map.get(reservation.line_id ?? -1) ?? []), reservation]);
    });
    return map;
  }, [reservations]);
  const expiresAt = reservations.find((reservation) => reservation.status === "ACTIVE")?.expires_at;

  const showError = (message?: string) => notify.error(tCommon("errorTitle"), message || tCommon("unexpectedError"));
  const lineName = (item: IOrderItem) => item.product_name ?? `#${item.product_id}`;
  const done = (ok: boolean, message?: string, error?: string) => {
    if (ok) {
      if (message) notify.success(message);
      router.refresh();
    } else showError(error);
  };

  // ── Acciones ───────────────────────────────────────────────────────────────
  const changeState = async (target: OrderState) => {
    let reason: string | undefined;
    if (target === "CANCELLED") {
      const value = await prompt({
        title: t("transitions.CANCELLED"),
        description: managed ? (pending ? t("cancelReleases") : t("cancelRestocks")) : undefined,
        confirmLabel: t("transitions.CANCELLED"),
        tone: "danger",
        input: { label: t("cancelReason"), multiline: true, required: false },
      });
      if (value === null) return;
      reason = value.trim() || undefined;
    } else {
      const ok = await confirm({
        title: t(`transitions.${target}`),
        description: managed && target === "PAID" ? t("payCommits") : t("confirmTransition", { state: tStates(target) }),
        confirmLabel: t(`transitions.${target}`),
      });
      if (!ok) return;
    }
    setBusy(true);
    const result = await changeOrderStatusServerAction(id, target, reason);
    setBusy(false);
    done(result.success, t("stateChanged", { state: tStates(target) }), result.success ? undefined : result.error);
  };

  const setPicked = async (item: IOrderItem, value: number) => {
    if (item.id == null) return;
    setBusy(true);
    const result = await pickOrderServerAction(id, { lines: [{ line_id: item.id, picked_quantity: value }] });
    setBusy(false);
    done(result.success, undefined, result.success ? undefined : result.error);
  };

  const pickAll = async () => {
    setBusy(true);
    const result = await pickAllOrderServerAction(id);
    setBusy(false);
    done(result.success, td("pickedAll"), result.success ? undefined : result.error);
  };

  const markReady = async () => {
    const ok = await confirm({ title: td("readyTitle"), description: pickup ? td("readyPickupText") : td("readyShipText"), confirmLabel: td("ready") });
    if (!ok) return;
    setBusy(true);
    const result = await readyOrderServerAction(id);
    setBusy(false);
    done(result.success, t("stateChanged", { state: tStates("READY") }), result.success ? undefined : result.error);
  };

  const submitShip = async () => {
    setBusy(true);
    const result = await shipOrderServerAction(id, {
      carrier_id: ship.carrier_id ? Number(ship.carrier_id) : undefined,
      tracking_number: ship.tracking.trim() || undefined,
      note: ship.note.trim() || undefined,
    });
    setBusy(false);
    if (result.success) setShipOpen(false);
    done(result.success, t("stateChanged", { state: tStates("SHIPPED") }), result.success ? undefined : result.error);
  };

  const deliver = async () => {
    const value = await prompt({
      title: td("deliverTitle"),
      description: pickup ? td("deliverPickupText") : td("deliverShipText"),
      confirmLabel: td("deliver"),
      input: { label: td("deliverNote"), multiline: true, required: false },
    });
    if (value === null) return;
    setBusy(true);
    const result = await deliverOrderServerAction(id, value.trim() || undefined);
    setBusy(false);
    done(result.success, t("stateChanged", { state: tStates("DELIVERED") }), result.success ? undefined : result.error);
  };

  const handleDeleteItem = async (item: IOrderItem) => {
    if (item.id == null) return;
    const ok = await confirm({
      title: tCommon("deleteConfirmTitle"),
      description: tCommon("deleteConfirmText", { name: lineName(item) }),
      confirmLabel: tCommon("deleteConfirmButton"),
      tone: "danger",
    });
    if (!ok) return;
    const result = await deleteOrderItemServerAction(item.id, id);
    done(result.success, tCommon("deletedSuccess"), result.success ? undefined : result.error);
  };

  // ── Avance del flujo ───────────────────────────────────────────────────────
  const steps: OrderState[] = pickup
    ? ["PENDING", "PAID", "PROCESSING", "READY", "DELIVERED"]
    : ["PENDING", "PAID", "PROCESSING", "READY", "SHIPPED", "DELIVERED"];
  const reached = state ? ORDER_STATES.indexOf(state) : -1;

  // ── Importes ───────────────────────────────────────────────────────────────
  const lineDiscounts = items.reduce((sum, item) => sum + (item.discount ?? 0), 0);
  const grossLines = items.reduce((sum, item) => sum + (item.subtotal ?? 0), 0);
  const shippingCharged = Math.max((order.shipping_amount ?? 0) - (order.shipping_discount ?? 0), 0);

  const primaryActions: ReactNode[] = [];
  if (pending && next.has("PAID")) {
    primaryActions.push(
      <Buttons key='pay' disabled={busy} onClick={() => changeState("PAID")} className='rounded-full'>
        <HiOutlineBanknotes className='h-4 w-4' aria-hidden='true' />
        {t("transitions.PAID")}
      </Buttons>,
    );
  }
  if (preparing && !allPicked) {
    primaryActions.push(
      <Buttons key='pickall' variant='outline' disabled={busy} onClick={pickAll} className='rounded-full'>
        <HiOutlineClipboardDocumentCheck className='h-4 w-4' aria-hidden='true' />
        {td("pickAll")}
      </Buttons>,
    );
  }
  if (preparing && next.has("READY")) {
    primaryActions.push(
      <Buttons key='ready' variant={pickup ? "default" : "outline"} disabled={busy || !allPicked} onClick={markReady} className='rounded-full'
        title={!allPicked ? td("pickFirst") : undefined}>
        <HiOutlineCheck className='h-4 w-4' aria-hidden='true' />
        {pickup ? td("readyPickup") : td("ready")}
      </Buttons>,
    );
  }
  if (!pickup && (preparing || state === "READY") && next.has("SHIPPED")) {
    primaryActions.push(
      <Buttons key='ship' disabled={busy || !allPicked} onClick={() => setShipOpen(true)} className='rounded-full'
        title={!allPicked ? td("pickFirst") : undefined}>
        <HiOutlineTruck className='h-4 w-4' aria-hidden='true' />
        {td("ship")}
      </Buttons>,
    );
  }
  if ((state === "SHIPPED" || (state === "READY" && pickup)) && next.has("DELIVERED")) {
    primaryActions.push(
      <Buttons key='deliver' disabled={busy} onClick={deliver} className='rounded-full'>
        <HiOutlineCheck className='h-4 w-4' aria-hidden='true' />
        {td("deliver")}
      </Buttons>,
    );
  }

  return (
    <section className='flex w-full flex-col gap-6'>
      <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
        <div className='space-y-2'>
          <Link href={ORDERS_HREF}
            className='inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground'>
            <HiOutlineArrowLeft className='h-4 w-4' aria-hidden='true' />
            {t("backToList")}
          </Link>
          <div className='flex flex-wrap items-center gap-2'>
            <h2 className='text-xl font-semibold tracking-tight text-foreground sm:text-2xl'>{order.order_number ?? t("orderLabel", { id })}</h2>
            <OrderStatusBadge state={order.state} />
            {order.payment_status ? (
              <Badge variant={PAYMENT_VARIANT[order.payment_status] ?? "outline"}>{tOpt(`paymentStatuses.${order.payment_status as "PAID"}`)}</Badge>
            ) : null}
            {order.priority && order.priority !== "NORMAL" ? (
              <Badge variant={order.priority === "URGENT" ? "destructive" : "secondary"}>{tOpt(`priorities.${order.priority as "HIGH"}`)}</Badge>
            ) : null}
            {order.overdue ? <Badge variant='destructive'>{td("overdue")}</Badge> : null}
          </div>
          <p className='text-sm text-muted-foreground'>
            {[
              t(`channels.${(order.channel ?? "BACKOFFICE") as "BACKOFFICE"}`),
              order.store_name,
              order.created_at ? td("createdAt", { date: formatApiDate(order.created_at) }) : null,
              order.complementary_order ? td("reference", { ref: order.complementary_order }) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          {primaryActions}
          {pending && !order.third_party_sale ? (
            <Buttons variant='outline' onClick={() => setItemModal({ open: true, item: null })} className='rounded-full'>
              <HiOutlinePlusCircle className='h-4 w-4' aria-hidden='true' />
              {tItems("create")}
            </Buttons>
          ) : null}
          {editable ? (
            <Link href={`${ORDERS_HREF}/${id}/edit`}
              className='inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:bg-muted'>
              <HiOutlinePencilSquare className='h-4 w-4' aria-hidden='true' />
              {td("edit")}
            </Link>
          ) : null}
          <Link href={`${ORDERS_HREF}/${id}/print`} target='_blank'
            className='inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:bg-muted'>
            <HiOutlinePrinter className='h-4 w-4' aria-hidden='true' />
            {td("print")}
          </Link>
          {next.has("CANCELLED") ? (
            <Buttons variant='ghost' disabled={busy} onClick={() => changeState("CANCELLED")} className='rounded-full text-destructive'>
              <HiOutlineXCircle className='h-4 w-4' aria-hidden='true' />
              {t("transitions.CANCELLED")}
            </Buttons>
          ) : null}
        </div>
      </div>

      {notice}

      {/* Avance */}
      {state === "CANCELLED" ? (
        <div role='status' className='flex gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm'>
          <HiOutlineXCircle className='mt-0.5 h-4 w-4 shrink-0 text-destructive' aria-hidden='true' />
          <p>{order.cancel_reason ? t("cancelledWithReason", { reason: order.cancel_reason }) : t("cancelledStock")}</p>
        </div>
      ) : (
        <ol className='grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-3 shadow-sm sm:flex sm:items-center' aria-label={td("progress")}>
          {steps.map((step, index) => {
            const doneStep = reached >= ORDER_STATES.indexOf(step);
            const current = state === step;
            return (
              <li key={step} className='flex flex-1 items-center gap-2'>
                <span className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  doneStep ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground",
                  current && "ring-2 ring-primary/30",
                )}>
                  {doneStep && !current ? <HiOutlineCheck className='h-3.5 w-3.5' aria-hidden='true' /> : index + 1}
                </span>
                <span className={cn("text-xs sm:text-sm", current ? "font-semibold text-foreground" : "text-muted-foreground")}
                  aria-current={current ? "step" : undefined}>
                  {tStates(step)}
                </span>
                {index < steps.length - 1 ? <span className='hidden h-px flex-1 bg-border sm:block' aria-hidden='true' /> : null}
              </li>
            );
          })}
        </ol>
      )}

      <KpiStrip
        items={[
          { label: t("fields.total"), value: formatMoney(order.total), icon: HiOutlineBanknotes, hint: td("taxesIncluded", { tax: formatMoney(order.tax_amount ?? 0) }) },
          {
            label: td("balance"),
            value: formatMoney(order.balance_due ?? 0),
            icon: HiOutlineBanknotes,
            tone: (order.balance_due ?? 0) > 0 ? "warn" : "good",
            hint: td("paid", { amount: formatMoney(order.paid_amount ?? 0) }),
          },
          {
            label: td("picking"),
            value: `${formatNumber(picked)} / ${formatNumber(units)}`,
            icon: HiOutlineArchiveBox,
            tone: units > 0 && picked >= units ? "good" : undefined,
          },
          {
            label: t("fields.promisedDate"),
            value: order.promised_date ? formatLocalDate(order.promised_date) : "—",
            icon: HiOutlineCalendarDays,
            tone: order.overdue ? "bad" : undefined,
          },
        ]}
      />

      <div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]'>
        <div className='grid content-start gap-6'>
          {/* Productos */}
          <SectionCard id='order-items' icon={HiOutlineShoppingCart} title={tItems("title")}
            hint={pending ? (managed ? (expiresAt ? t("pendingStockUntil", { date: formatApiDate(expiresAt) }) : t("pendingStock")) : t("legacyStock"))
              : preparing ? td("pickingHint") : tItems("locked")}
            contentClassName='p-0'>
            {items.length === 0 ? (
              <div className='col-span-12 p-6 text-center text-sm text-muted-foreground'>
                <p className='font-medium text-foreground'>{tItems("emptyTitle")}</p>
                <p>{tItems("emptyDescription")}</p>
              </div>
            ) : (
              <div className='col-span-12 overflow-x-auto'>
                <table className='w-full min-w-[720px] text-sm'>
                  <thead className='bg-muted/40 text-left text-xs text-muted-foreground'>
                    <tr>
                      <th className='px-4 py-2 font-medium'>{tItems("fields.productId")}</th>
                      <th className='px-3 py-2 text-right font-medium'>{tItems("fields.unitPrice")}</th>
                      <th className='px-3 py-2 text-right font-medium'>{tItems("fields.quantity")}</th>
                      <th className='px-3 py-2 text-right font-medium'>{tItems("fields.discount")}</th>
                      <th className='px-3 py-2 text-right font-medium'>{tItems("fields.total")}</th>
                      <th className='px-3 py-2 font-medium'>{td("pickedColumn")}</th>
                      {linesEditable ? <th className='w-20 px-3 py-2'><span className='sr-only'>{tCommon("actions")}</span></th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const quantity = item.quantity ?? 0;
                      const lineDone = (item.picked_quantity ?? 0) >= quantity;
                      const lineReservations = reservationsByLine.get(item.id ?? -1) ?? [];
                      return (
                        <tr key={item.id} className='border-t border-border align-top'>
                          <td className='px-4 py-2.5'>
                            <p className='font-medium text-foreground'>{lineName(item)}</p>
                            <p className='font-mono text-xs text-muted-foreground'>{item.sku_code}</p>
                            {managed && lineReservations.length > 0 ? (
                              <div className='mt-1 flex flex-wrap gap-1'>
                                {lineReservations.map((reservation) => (
                                  <Badge key={reservation.id} variant={RESERVATION_VARIANT[reservation.status ?? ""] ?? "outline"}>
                                    {t(`reservationStatus.${(reservation.status ?? "ACTIVE") as "ACTIVE"}`)} {reservation.quantity} ·{" "}
                                    {warehouseNames.get(reservation.warehouse_id ?? -1) ?? `#${reservation.warehouse_id}`}
                                  </Badge>
                                ))}
                              </div>
                            ) : null}
                          </td>
                          <td className='px-3 py-2.5 text-right tabular-nums'>{formatMoney(item.unit_price)}</td>
                          <td className='px-3 py-2.5 text-right tabular-nums'>{formatNumber(quantity)}</td>
                          <td className='px-3 py-2.5 text-right tabular-nums'>
                            {formatMoney((item.discount ?? 0) + (item.order_discount ?? 0))}
                            {(item.order_discount ?? 0) > 0 ? (
                              <p className='text-xs text-muted-foreground'>{td("orderDiscountShare", { amount: formatMoney(item.order_discount) })}</p>
                            ) : null}
                          </td>
                          <td className='px-3 py-2.5 text-right font-medium tabular-nums'>{formatMoney(item.total)}</td>
                          <td className='px-3 py-2'>
                            {preparing ? (
                              <div className='flex items-center gap-1'>
                                <Buttons type='button' variant='outline' size='icon' className='h-8 w-8' disabled={busy || (item.picked_quantity ?? 0) <= 0}
                                  aria-label={td("pickLess", { name: lineName(item) })} onClick={() => setPicked(item, (item.picked_quantity ?? 0) - 1)}>
                                  <HiOutlineMinus className='h-3.5 w-3.5' aria-hidden='true' />
                                </Buttons>
                                <span className={cn("w-14 text-center text-sm tabular-nums", lineDone && "font-semibold text-emerald-700 dark:text-emerald-400")}>
                                  {item.picked_quantity ?? 0}/{quantity}
                                </span>
                                <Buttons type='button' variant='outline' size='icon' className='h-8 w-8' disabled={busy || lineDone}
                                  aria-label={td("pickMore", { name: lineName(item) })} onClick={() => setPicked(item, (item.picked_quantity ?? 0) + 1)}>
                                  <HiOutlinePlus className='h-3.5 w-3.5' aria-hidden='true' />
                                </Buttons>
                              </div>
                            ) : (
                              <span className={cn("text-sm tabular-nums", lineDone ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground")}>
                                {item.picked_quantity ?? 0}/{quantity}
                              </span>
                            )}
                          </td>
                          {linesEditable ? (
                            <td className='px-3 py-2'>
                              <div className='flex justify-end gap-1'>
                                <Buttons type='button' variant='ghost' size='icon' aria-label={tCommon("edit")} onClick={() => setItemModal({ open: true, item })}>
                                  <HiOutlinePencilSquare className='h-4 w-4' aria-hidden='true' />
                                </Buttons>
                                <Buttons type='button' variant='ghost' size='icon' aria-label={tCommon("delete")} onClick={() => handleDeleteItem(item)}>
                                  <HiOutlineTrash className='h-4 w-4 text-destructive' aria-hidden='true' />
                                </Buttons>
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <dl className='col-span-12 ml-auto grid w-full max-w-sm grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-1.5 border-t border-border p-4 text-sm'>
              <dt className='text-muted-foreground'>{td("grossLines")}</dt>
              <dd className='text-right tabular-nums'>{formatMoney(grossLines)}</dd>
              {lineDiscounts > 0 ? (
                <>
                  <dt className='text-muted-foreground'>{td("lineDiscounts")}</dt>
                  <dd className='text-right tabular-nums'>− {formatMoney(lineDiscounts)}</dd>
                </>
              ) : null}
              {(order.discount_amount ?? 0) > 0 ? (
                <>
                  <dt className='text-muted-foreground'>
                    {order.discount_type === "COUPON" ? td("couponDiscount", { code: order.coupon_code ?? "" }) : td("orderDiscount")}
                  </dt>
                  <dd className='text-right tabular-nums'>− {formatMoney(order.discount_amount)}</dd>
                </>
              ) : null}
              {(order.shipping_amount ?? 0) > 0 ? (
                <>
                  <dt className='text-muted-foreground'>{t("fields.shippingAmount")}</dt>
                  <dd className='text-right tabular-nums'>
                    {(order.shipping_discount ?? 0) > 0 ? (
                      <span className='mr-2 text-xs text-muted-foreground line-through'>{formatMoney(order.shipping_amount)}</span>
                    ) : null}
                    {formatMoney(shippingCharged)}
                  </dd>
                </>
              ) : null}
              <dt className='text-muted-foreground'>{t("fields.taxes")}</dt>
              <dd className='text-right tabular-nums'>{formatMoney(order.tax_amount ?? 0)}</dd>
              <dt className='border-t border-border pt-2 font-semibold text-foreground'>{t("fields.total")}</dt>
              <dd className='border-t border-border pt-2 text-right text-base font-semibold tabular-nums'>{formatMoney(order.total)}</dd>
              {(order.returned_amount ?? 0) > 0 ? (
                <>
                  <dt className='text-muted-foreground'>{t("fields.returnedAmount")}</dt>
                  <dd className='text-right tabular-nums'>− {formatMoney(order.returned_amount)}</dd>
                </>
              ) : null}
            </dl>
          </SectionCard>

          {payments}
          {invoices}
          {returns}
        </div>

        <aside className='grid content-start gap-6'>
          {/* Cliente */}
          <SectionCard id='order-customer' icon={HiOutlineUser} title={td("customer")} contentClassName='p-4'>
            <div className='col-span-12 grid gap-1 text-sm'>
              {order.customer_name ? (
                <>
                  <p className='font-semibold text-foreground'>{order.customer_name}</p>
                  {order.customer_doc_number ? (
                    <p className='text-muted-foreground'>{[order.customer_doc_type, order.customer_doc_number].filter(Boolean).join(" ")}</p>
                  ) : null}
                  {order.customer_email ? <a className='text-primary hover:underline' href={`mailto:${order.customer_email}`}>{order.customer_email}</a> : null}
                  {order.customer_phone ? <a className='text-primary hover:underline' href={`tel:${order.customer_phone}`}>{order.customer_phone}</a> : null}
                  {order.billing_address ? (
                    <p className='text-muted-foreground'>{[order.billing_address, order.billing_city].filter(Boolean).join(", ")}</p>
                  ) : null}
                  <p className='mt-1 text-xs text-muted-foreground'>{order.customer_id != null ? td("registered") : td("guest")}</p>
                  {customerProfileId != null ? (
                    <Link href={`${CUSTOMERS_HREF}/${customerProfileId}`} className='mt-1 text-sm font-medium text-primary hover:underline'>
                      {td("customerProfile")}
                    </Link>
                  ) : customerProfileId === null && order.customer_doc_number ? (
                    <p className='mt-1 text-xs text-muted-foreground'>{td("customerNotRegistered")}</p>
                  ) : null}
                </>
              ) : (
                <p className='text-muted-foreground'>{td("noCustomer")}</p>
              )}
            </div>
          </SectionCard>

          {/* Entrega */}
          <SectionCard id='order-delivery' icon={pickup ? HiOutlineBuildingStorefront : HiOutlineTruck}
            title={pickup ? tOpt("deliveryMethods.PICKUP") : tOpt("deliveryMethods.SHIPPING")} contentClassName='p-4'>
            <dl className='col-span-12 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm'>
              {pickup ? (
                <>
                  <dt className='text-muted-foreground'>{t("fields.pickupStore")}</dt>
                  <dd className='text-right font-medium'>{order.pickup_store_name ?? "—"}</dd>
                </>
              ) : (
                <>
                  <dt className='text-muted-foreground'>{t("fields.recipientName")}</dt>
                  <dd className='text-right font-medium'>{order.recipient_name ?? "—"}</dd>
                  <dt className='text-muted-foreground'>{t("fields.address")}</dt>
                  <dd className='text-right'>
                    {[order.ship_address, order.ship_address_detail].filter(Boolean).join(" · ") || "—"}
                    <span className='block text-xs text-muted-foreground'>
                      {[order.ship_city, order.ship_state, order.ship_country].filter(Boolean).join(", ")}
                    </span>
                  </dd>
                  <dt className='text-muted-foreground'>{t("fields.carrier")}</dt>
                  <dd className='text-right'>{order.carrier_name ?? td("ownDelivery")}</dd>
                  {order.tracking_number ? (
                    <>
                      <dt className='text-muted-foreground'>{t("fields.trackingNumber")}</dt>
                      <dd className='text-right font-mono'>{order.tracking_number}</dd>
                    </>
                  ) : null}
                </>
              )}
              {order.recipient_phone ? (
                <>
                  <dt className='text-muted-foreground'>{t("fields.phone")}</dt>
                  <dd className='text-right'>{order.recipient_phone}</dd>
                </>
              ) : null}
              <dt className='text-muted-foreground'>{t("fields.promisedDate")}</dt>
              <dd className={cn("text-right", order.overdue && "font-medium text-destructive")}>
                {order.promised_date ? formatLocalDate(order.promised_date) : "—"}
              </dd>
              {order.shipped_at ? (
                <>
                  <dt className='text-muted-foreground'>{td("shippedAt")}</dt>
                  <dd className='text-right'>{formatApiDate(order.shipped_at)}</dd>
                </>
              ) : null}
              {order.delivered_at ? (
                <>
                  <dt className='text-muted-foreground'>{td("deliveredAt")}</dt>
                  <dd className='text-right'>{formatApiDate(order.delivered_at)}</dd>
                </>
              ) : null}
            </dl>
            {order.delivery_notes ? (
              <p className='col-span-12 rounded-lg bg-muted/40 p-2 text-xs text-muted-foreground'>{order.delivery_notes}</p>
            ) : null}
          </SectionCard>

          {/* Origen y notas */}
          <SectionCard id='order-origin' icon={HiOutlineInformationCircle} title={td("origin")} contentClassName='p-4'>
            <dl className='col-span-12 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm'>
              <dt className='text-muted-foreground'>{t("fields.channel")}</dt>
              <dd className='text-right'>{t(`channels.${(order.channel ?? "BACKOFFICE") as "BACKOFFICE"}`)}</dd>
              <dt className='text-muted-foreground'>{t("fields.store")}</dt>
              <dd className='text-right'>{order.store_name ?? "—"}</dd>
              <dt className='text-muted-foreground'>{t("fields.warehouse")}</dt>
              <dd className='text-right'>{order.warehouse_name ?? td("anyWarehouse")}</dd>
              <dt className='text-muted-foreground'>{t("fields.assignedTo")}</dt>
              <dd className='text-right'>{order.assigned_to ?? "—"}</dd>
              <dt className='text-muted-foreground'>{t("fields.priority")}</dt>
              <dd className='text-right'>{tOpt(`priorities.${(order.priority ?? "NORMAL") as "NORMAL"}`)}</dd>
            </dl>
            {order.internal_notes ? (
              <div className='col-span-12 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-xs'>
                <p className='font-medium text-foreground'>{t("fields.internalNotes")}</p>
                <p className='whitespace-pre-line text-muted-foreground'>{order.internal_notes}</p>
              </div>
            ) : null}
            {order.customer_notes ? (
              <div className='col-span-12 rounded-lg bg-muted/40 p-2 text-xs'>
                <p className='font-medium text-foreground'>{t("fields.customerNotes")}</p>
                <p className='whitespace-pre-line text-muted-foreground'>{order.customer_notes}</p>
              </div>
            ) : null}
          </SectionCard>

          <OrderTimeline orderId={id} events={events} />
        </aside>
      </div>

      <Modal size='lg' title={itemModal.item ? tItems("editTitle") : tItems("createTitle")} open={itemModal.open}
        onOpenChange={(open) => !open && setItemModal({ open: false, item: null })} hideDefaultFooter={true}>
        {itemModal.open ? (
          <OrderItemForm orderId={id} item={itemModal.item} handleClose={() => setItemModal({ open: false, item: null })} />
        ) : null}
      </Modal>

      <Modal size='md' title={td("shipTitle")} open={shipOpen} onOpenChange={setShipOpen} hideDefaultFooter={true}>
        {shipOpen ? (
          <form className='grid gap-4' onSubmit={(event) => { event.preventDefault(); void submitShip(); }}>
            <p className='text-sm text-muted-foreground'>
              {[order.recipient_name, order.ship_address, order.ship_city].filter(Boolean).join(" · ")}
            </p>
            <label className='grid gap-1.5 text-sm'>
              <span className='font-medium text-foreground'>{t("fields.carrier")}</span>
              <select value={ship.carrier_id} onChange={(event) => setShip({ ...ship, carrier_id: event.target.value })}
                className='h-10 rounded-lg border border-input bg-background px-3 text-sm'>
                <option value=''>{td("ownDelivery")}</option>
                {carriers.map((carrier) => (
                  <option key={carrier.id} value={String(carrier.id)}>{carrier.name}</option>
                ))}
              </select>
            </label>
            <label className='grid gap-1.5 text-sm'>
              <span className='font-medium text-foreground'>{t("fields.trackingNumber")}</span>
              <input value={ship.tracking} onChange={(event) => setShip({ ...ship, tracking: event.target.value })} maxLength={80}
                required={Boolean(ship.carrier_id)} className='h-10 rounded-lg border border-input bg-background px-3 font-mono text-sm' />
              <span className='text-xs text-muted-foreground'>{ship.carrier_id ? td("trackingRequired") : td("trackingOptional")}</span>
            </label>
            <label className='grid gap-1.5 text-sm'>
              <span className='font-medium text-foreground'>{td("shipNote")}</span>
              <textarea value={ship.note} onChange={(event) => setShip({ ...ship, note: event.target.value })} rows={2} maxLength={500}
                className='rounded-lg border border-input bg-background px-3 py-2 text-sm' />
            </label>
            <div className='flex justify-end gap-2'>
              <Buttons type='button' variant='outline' className='rounded-full' onClick={() => setShipOpen(false)}>{tCommon("cancel")}</Buttons>
              <Buttons type='submit' className='rounded-full' loading={busy}>
                <HiOutlineTruck className='h-4 w-4' aria-hidden='true' />
                {td("ship")}
              </Buttons>
            </div>
          </form>
        ) : null}
      </Modal>
    </section>
  );
};
