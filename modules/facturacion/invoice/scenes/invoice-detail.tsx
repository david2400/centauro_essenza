/** @format */

"use client";

import { useTranslations } from "next-intl";
import { Buttons } from "@repo/ui/buttons/scenes";
import { HiOutlineArrowLeft, HiOutlineArrowPath, HiOutlinePrinter, HiOutlineReceiptRefund } from "react-icons/hi2";
import { Link } from "@/shared/i18n/routing";
import { InvoiceDocument } from "../components/invoice-document";
import { useInvoiceActions } from "../hooks/useInvoiceActions";
import type { IBillingSettings, IInvoice } from "../models/invoice.interface";

/** Estilos de impresión: solo se imprime la representación gráfica. */
const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  #invoice-print, #invoice-print * { visibility: visible !important; }
  #invoice-print { position: absolute; inset: 0 auto auto 0; width: 100%; }
  @page { margin: 12mm; }
}`;

/** Detalle de factura o nota crédito con su representación gráfica y acciones. */
export const InvoiceDetail = ({ invoice, issuer }: { invoice: IInvoice; issuer: IBillingSettings | null }) => {
  const t = useTranslations("Administre.billing.invoice");
  const { retry, creditNote, busy } = useInvoiceActions();
  const actions = invoice.actions ?? [];

  return (
    <section className='flex w-full flex-col gap-6'>
      <style>{PRINT_CSS}</style>
      <div className='flex flex-wrap items-center justify-between gap-3 print:hidden'>
        <div className='flex flex-wrap items-center gap-4'>
          <Link
            href='/facturacion/invoices'
            className='inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground'>
            <HiOutlineArrowLeft className='h-4 w-4' aria-hidden='true' />
            {t("back")}
          </Link>
          {invoice.order_id != null ? (
            <Link href={`/ventas/orders/${invoice.order_id}`} className='text-sm font-medium text-primary underline-offset-4 hover:underline'>
              {t("viewOrder", { id: invoice.order_id })}
            </Link>
          ) : null}
          {invoice.related_invoice_id ? (
            <Link
              href={`/facturacion/invoices/${invoice.related_invoice_id}`}
              className='text-sm font-medium text-primary underline-offset-4 hover:underline'>
              {t("viewRelated", { number: invoice.related_number ?? "" })}
            </Link>
          ) : null}
        </div>
        <div className='flex flex-wrap gap-2'>
          {actions.includes("retry") ? (
            <Buttons type='button' variant='outline' className='rounded-full' disabled={busy != null} onClick={() => retry(invoice)}>
              <HiOutlineArrowPath className='h-4 w-4' aria-hidden='true' />
              {t("actions.retry")}
            </Buttons>
          ) : null}
          {actions.includes("credit_note") ? (
            <Buttons type='button' variant='outline' className='rounded-full' disabled={busy != null} onClick={() => creditNote(invoice)}>
              <HiOutlineReceiptRefund className='h-4 w-4' aria-hidden='true' />
              {t("actions.creditNote")}
            </Buttons>
          ) : null}
          <Buttons type='button' className='rounded-full' onClick={() => window.print()}>
            <HiOutlinePrinter className='h-4 w-4' aria-hidden='true' />
            {t("actions.print")}
          </Buttons>
        </div>
      </div>
      {invoice.status_detail && invoice.status !== "ISSUED" ? (
        <p className='rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-800 dark:text-amber-300 print:hidden'>
          {invoice.status_detail}
        </p>
      ) : null}
      <InvoiceDocument invoice={invoice} issuer={issuer} />
    </section>
  );
};
