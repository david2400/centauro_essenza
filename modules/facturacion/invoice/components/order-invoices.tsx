/** @format */

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Buttons } from "@repo/ui/buttons/scenes";
import {
  HiOutlineArrowPath,
  HiOutlineDocumentText,
  HiOutlineExclamationTriangle,
  HiOutlineEye,
  HiOutlineReceiptRefund,
} from "react-icons/hi2";
import { Link } from "@/shared/i18n/routing";
import { formatApiDate, formatMoney } from "@/lib/format";
import { InvoiceStatusBadge } from "./invoice-status-badge";
import { useInvoiceActions } from "../hooks/useInvoiceActions";
import { BILLABLE_ORDER_STATES, type IBillingSettings, type IInvoice } from "../models/invoice.interface";
import dynamic from "next/dynamic";
import { useMountedOnce } from "@/lib/use-mounted-once";

// Se descargan al abrirse (no viajan con la página).
const IssueInvoiceDialog = dynamic(() => import("./issue-invoice-dialog").then((m) => m.IssueInvoiceDialog));

interface OrderInvoicesProps {
  orderId: number;
  orderState?: string;
  orderTotal?: number;
  invoices: IInvoice[] | null;
  settings: IBillingSettings | null;
}

/**
 * Facturación de una orden: factura vigente, notas crédito y acciones (emitir, reenviar,
 * anular, ver). Solo se factura una orden pagada y con el emisor configurado.
 */
export const OrderInvoices = ({ orderId, orderState, orderTotal, invoices, settings }: OrderInvoicesProps) => {
  const t = useTranslations("Administre.billing.invoice");
  const to = useTranslations("Administre.billing.invoice.order");
  const [issuing, setIssuing] = useState(false);
  const issueMounted = useMountedOnce(issuing);
  const { retry, creditNote, busy } = useInvoiceActions();

  if (invoices == null) {
    return (
      <section className='rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm sm:p-6'>
        <p className='flex items-center gap-2'>
          <HiOutlineExclamationTriangle className='h-4 w-4 shrink-0' aria-hidden='true' />
          {to("unavailable")}
        </p>
      </section>
    );
  }

  const active = invoices.find((invoice) => invoice.kind === "INVOICE" && invoice.status !== "VOIDED");
  const billable = BILLABLE_ORDER_STATES.includes(orderState ?? "");
  const ready = Boolean(settings?.ready);
  const canIssue = billable && ready && !active;
  const hint = active
    ? null
    : !billable
      ? to("notPaid")
      : !ready
        ? to("notReady")
        : to("ready");

  return (
    <section className='flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h3 className='text-base font-semibold text-foreground'>{to("title")}</h3>
          <p className='mt-0.5 text-sm text-muted-foreground'>{hint ?? to("subtitle")}</p>
          {!ready && billable && !active ? (
            <Link href='/facturacion/settings' className='text-sm font-medium text-primary underline-offset-4 hover:underline'>
              {to("configure")}
            </Link>
          ) : null}
        </div>
        <Buttons type='button' className='rounded-full' disabled={!canIssue} onClick={() => setIssuing(true)}>
          <HiOutlineDocumentText className='h-4 w-4' aria-hidden='true' />
          {to("issue")}
        </Buttons>
      </div>

      {invoices.length > 0 ? (
        <ul className='grid gap-2'>
          {invoices.map((invoice) => {
            const actions = invoice.actions ?? [];
            return (
              <li
                key={invoice.id}
                className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3'>
                <div className='min-w-0'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <span className='font-mono text-sm font-semibold'>{invoice.full_number}</span>
                    <span className='text-xs text-muted-foreground'>{t(`kinds.${invoice.kind === "CREDIT_NOTE" ? "CREDIT_NOTE" : "INVOICE"}`)}</span>
                    <InvoiceStatusBadge status={invoice.status} />
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    {formatApiDate(invoice.issued_at)} · {invoice.buyer?.name} · {formatMoney(invoice.total)}
                  </p>
                  {invoice.status_detail && invoice.status !== "ISSUED" ? (
                    <p className='text-xs text-amber-700 dark:text-amber-400'>{invoice.status_detail}</p>
                  ) : null}
                </div>
                <div className='flex flex-wrap gap-2'>
                  {actions.includes("retry") ? (
                    <Buttons type='button' size='sm' variant='outline' className='rounded-full' disabled={busy === invoice.id} onClick={() => retry(invoice)}>
                      <HiOutlineArrowPath className='h-4 w-4' aria-hidden='true' />
                      {t("actions.retry")}
                    </Buttons>
                  ) : null}
                  {actions.includes("credit_note") ? (
                    <Buttons type='button' size='sm' variant='outline' className='rounded-full' disabled={busy === invoice.id} onClick={() => creditNote(invoice)}>
                      <HiOutlineReceiptRefund className='h-4 w-4' aria-hidden='true' />
                      {t("actions.creditNote")}
                    </Buttons>
                  ) : null}
                  <Link
                    href={`/facturacion/invoices/${invoice.id}`}
                    className='inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-sm font-medium hover:bg-muted'>
                    <HiOutlineEye className='h-4 w-4' aria-hidden='true' />
                    {t("actions.view")}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className='rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground'>{to("empty")}</p>
      )}

      {issueMounted ? (
        <IssueInvoiceDialog open={issuing} onClose={() => setIssuing(false)} orderId={orderId} total={orderTotal} />
      ) : null}
    </section>
  );
};
