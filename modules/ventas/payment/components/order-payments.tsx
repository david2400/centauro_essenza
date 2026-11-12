/** @format */

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Buttons } from "@repo/ui/buttons/scenes";
import {
  HiOutlineBanknotes,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineCreditCard,
  HiOutlineExclamationTriangle,
  HiOutlinePlusCircle,
  HiOutlineScale,
} from "react-icons/hi2";
import { DataGrid, type GridColumn } from "@/components/data-grid";
import { KpiStrip } from "@/components/form-sections";
import { formatApiDate, formatMoney } from "@/lib/format";
import { KIND_ICONS } from "@/modules/ventas/paymentMethod/scenes/formPaymentMethod";
import { isPaymentKind, type IPaymentMethod } from "@/modules/ventas/paymentMethod/models/paymentMethod.interface";
import { OrderPaymentStatusBadge, PaymentStatusBadge } from "../scenes/payment-status-badge";
import { usePaymentActions } from "../hooks/usePaymentActions";
import type { IOrderPayments, IPayment } from "../models/payment.interface";
import dynamic from "next/dynamic";
import { useMountedOnce } from "@/lib/use-mounted-once";

// Se descargan al abrirse (no viajan con la página).
const RegisterPaymentDialog = dynamic(() => import("./register-payment-dialog").then((m) => m.RegisterPaymentDialog));

interface OrderPaymentsProps {
  data: IOrderPayments | null;
  /** Medios activos para cobrar. */
  methods: IPaymentMethod[];
  /**
   * Subpedido de un vendedor externo: el comprador le paga al vendedor. La tienda no cobra en línea
   * ni en caja; solo registra el pago que el vendedor confirme (draco lo valida igual).
   */
  thirdParty?: boolean;
}

/**
 * Pagos de una orden: saldo (total, pagado, pendiente, por cobrar), cobros físicos y
 * virtuales, link de pasarela y acciones por pago (confirmar, anular, reembolsar…).
 */
export const OrderPayments = ({ data, methods: allMethods, thirdParty = false }: OrderPaymentsProps) => {
  const methods = thirdParty ? allMethods.filter((method) => method.kind !== "GATEWAY") : allMethods;
  const t = useTranslations("Administre.payment");
  const to = useTranslations("Administre.payment.order");
  const [registering, setRegistering] = useState(false);
  const registerMounted = useMountedOnce(registering);
  const { rowActions, dialogs, start, syncing } = usePaymentActions();

  if (!data) {
    return (
      <section className='rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm sm:p-6'>
        <p className='flex items-center gap-2'>
          <HiOutlineExclamationTriangle className='h-4 w-4 shrink-0' aria-hidden='true' />
          {to("unavailable")}
        </p>
      </section>
    );
  }

  const payments = data.payments ?? [];
  const collectable = data.collectable ?? 0;
  const cancelled = data.order_state === "CANCELLED";
  const canCollect = !cancelled && collectable > 0 && (data.order_total ?? 0) > 0;
  const pendingGateway = payments.filter((payment) => payment.status === "PENDING" && payment.provider);

  const columns: GridColumn<IPayment>[] = [
    {
      id: "method",
      header: t("fields.method"),
      meta: { label: t("fields.method"), hideable: false, exportValue: (row) => row.method_name },
      cell: ({ row }) => {
        const Icon = isPaymentKind(row.original.kind) ? KIND_ICONS[row.original.kind] : HiOutlineCreditCard;
        return (
          <div className='flex min-w-0 items-center gap-2.5'>
            <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground'>
              <Icon className='h-4 w-4' aria-hidden='true' />
            </span>
            <div className='min-w-0'>
              <p className='truncate font-medium text-foreground'>{row.original.method_name ?? "—"}</p>
              <p className='truncate font-mono text-xs text-muted-foreground'>{row.original.payment_reference}</p>
            </div>
          </div>
        );
      },
    },
    {
      id: "status",
      header: t("fields.status"),
      meta: { label: t("fields.status"), exportValue: (row) => row.status },
      cell: ({ row }) => (
        <div className='grid gap-0.5'>
          <PaymentStatusBadge status={row.original.status} />
          {row.original.status_detail ? (
            <span className='max-w-[14rem] truncate text-xs text-muted-foreground' title={row.original.status_detail}>
              {row.original.status_detail}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      id: "amount",
      header: t("fields.amount"),
      meta: { label: t("fields.amount"), align: "right", exportValue: (row) => row.amount },
      cell: ({ row }) => (
        <div className='text-right'>
          <p className='font-medium tabular-nums'>{formatMoney(row.original.amount)}</p>
          {(row.original.refunded_amount ?? 0) > 0 ? (
            <p className='text-xs tabular-nums text-destructive'>−{formatMoney(row.original.refunded_amount)}</p>
          ) : null}
          {(row.original.change_amount ?? 0) > 0 ? (
            <p className='text-xs tabular-nums text-muted-foreground'>{t("changeShort", { amount: formatMoney(row.original.change_amount) })}</p>
          ) : null}
        </div>
      ),
    },
    {
      id: "reference",
      header: t("fields.reference"),
      enableSorting: false,
      meta: { label: t("fields.reference"), exportValue: (row) => row.reference ?? row.provider_reference },
      cell: ({ row }) => (
        <span className='text-sm'>{row.original.reference || row.original.provider_reference || "—"}</span>
      ),
    },
    {
      id: "createdAt",
      header: t("fields.createdAt"),
      meta: { label: t("fields.createdAt"), exportValue: (row) => formatApiDate(row.created_at) },
      cell: ({ row }) => <span className='whitespace-nowrap text-xs text-muted-foreground'>{formatApiDate(row.original.created_at)}</span>,
    },
  ];

  return (
    <section className='flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <div className='flex flex-wrap items-center gap-2'>
            <h3 className='text-base font-semibold text-foreground'>{to("title")}</h3>
            <OrderPaymentStatusBadge status={data.payment_status} />
          </div>
          <p className='mt-0.5 text-sm text-muted-foreground'>{cancelled ? to("cancelled") : thirdParty ? to("thirdParty") : to("subtitle")}</p>
        </div>
        <div className='flex flex-wrap gap-2'>
          {pendingGateway.length > 0 ? (
            <Buttons
              type='button'
              variant='outline'
              className='rounded-full'
              disabled={syncing != null}
              onClick={() => pendingGateway.forEach((payment) => void start(payment, "sync"))}>
              {to("syncAll")}
            </Buttons>
          ) : null}
          <Buttons type='button' className='rounded-full' disabled={!canCollect} onClick={() => setRegistering(true)}>
            <HiOutlinePlusCircle className='h-4 w-4' aria-hidden='true' />
            {to("collect")}
          </Buttons>
        </div>
      </div>

      <KpiStrip
        items={[
          { label: to("total"), value: formatMoney(data.order_total), icon: HiOutlineBanknotes },
          { label: to("paid"), value: formatMoney(data.paid_amount), icon: HiOutlineCheckCircle, tone: (data.paid_amount ?? 0) > 0 ? "good" : undefined },
          {
            label: to("pending"),
            value: formatMoney(data.pending_amount),
            icon: HiOutlineClock,
            tone: (data.pending_amount ?? 0) > 0 ? "warn" : undefined,
            hint: (data.pending_amount ?? 0) > 0 ? to("pendingHint") : undefined,
          },
          {
            label: (data.balance ?? 0) < 0 ? to("overpaid") : to("balance"),
            value: formatMoney(Math.abs(data.balance ?? 0)),
            icon: HiOutlineScale,
            tone: (data.balance ?? 0) < 0 ? "bad" : (data.balance ?? 0) === 0 ? "good" : undefined,
            hint: collectable > 0 ? to("collectable", { amount: formatMoney(collectable) }) : undefined,
          },
        ]}
      />

      {(data.order_total ?? 0) > 0 ? (
        <div
          className='h-2 overflow-hidden rounded-full bg-muted'
          role='progressbar'
          aria-label={to("progress")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(100, Math.round(((data.paid_amount ?? 0) / (data.order_total ?? 1)) * 100))}>
          <div className='flex h-full'>
            <div
              className='h-full bg-emerald-500'
              style={{ width: `${Math.min(100, ((data.paid_amount ?? 0) / (data.order_total ?? 1)) * 100)}%` }}
            />
            <div
              className='h-full bg-amber-400'
              style={{ width: `${Math.min(100, ((data.pending_amount ?? 0) / (data.order_total ?? 1)) * 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      <DataGrid<IPayment>
        mode='client'
        embedded
        id='order-payments'
        caption={to("title")}
        data={payments}
        columns={columns}
        getRowId={(payment) => String(payment.id)}
        searchText={(payment) => `${payment.method_name ?? ""} ${payment.payment_reference ?? ""} ${payment.reference ?? ""}`}
        rowActions={rowActions}
        emptyState={{
          title: to("emptyTitle"),
          description: canCollect ? to("emptyDescription") : to("emptyNoBalance"),
        }}
      />

      {registerMounted ? (
        <RegisterPaymentDialog
          open={registering}
          onClose={() => setRegistering(false)}
          orderId={data.order_id ?? 0}
          collectable={collectable}
          methods={methods}
        />
      ) : null}
      {dialogs}
    </section>
  );
};
