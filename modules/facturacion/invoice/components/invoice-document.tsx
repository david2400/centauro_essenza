/** @format */

"use client";

import { useTranslations } from "next-intl";
import { formatApiDate, formatLocalDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { InvoiceStatusBadge } from "./invoice-status-badge";
import type { IBillingSettings, IInvoice } from "../models/invoice.interface";
import dynamic from "next/dynamic";

// Se descargan al abrirse (no viajan con la página).
const InvoiceQr = dynamic(() => import("./invoice-qr").then((m) => m.InvoiceQr));

/**
 * Representación gráfica de la factura o nota crédito: emisor, adquiriente, líneas,
 * impuestos por tarifa, totales, resolución de numeración, CUFE/CUDE y código QR.
 * Pensada para imprimir (o guardar como PDF desde el navegador).
 */
export const InvoiceDocument = ({ invoice, issuer }: { invoice: IInvoice; issuer: IBillingSettings | null }) => {
  const t = useTranslations("Administre.billing.invoice");
  const td = useTranslations("Administre.billing.invoice.document");
  const isNote = invoice.kind === "CREDIT_NOTE";
  const buyer = invoice.buyer;

  return (
    <article
      id='invoice-print'
      className='mx-auto grid w-full max-w-4xl gap-6 rounded-2xl border border-border bg-white p-6 text-sm text-gray-900 shadow-sm sm:p-8 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none'>
      <header className='flex flex-wrap items-start justify-between gap-6 border-b border-gray-200 pb-5'>
        <div className='grid gap-1'>
          <p className='text-lg font-bold tracking-tight'>{issuer?.trade_name || issuer?.legal_name || "—"}</p>
          {issuer?.trade_name && issuer?.legal_name ? <p>{issuer.legal_name}</p> : null}
          <p>
            {td("nit")} {issuer?.nit ?? "—"}
            {issuer?.dv ? `-${issuer.dv}` : ""} · {issuer?.tax_regime ? td(`regimes.${issuer.tax_regime as "RESPONSABLE_IVA"}`) : ""}
          </p>
          <p className='text-gray-600'>{[issuer?.address, issuer?.city, issuer?.department].filter(Boolean).join(", ")}</p>
          <p className='text-gray-600'>{[issuer?.email, issuer?.phone].filter(Boolean).join(" · ")}</p>
        </div>
        <div className='grid justify-items-end gap-1 text-right'>
          <p className='text-xs font-semibold uppercase tracking-[0.14em] text-gray-500'>
            {isNote ? td("creditNoteTitle") : td("invoiceTitle")}
          </p>
          <p className='text-2xl font-bold tabular-nums'>{invoice.full_number}</p>
          <p className='text-gray-600'>{formatApiDate(invoice.issued_at)}</p>
          <div className='print:hidden'>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          {invoice.environment === "TEST" ? (
            <p className='rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800'>{td("testEnvironment")}</p>
          ) : null}
        </div>
      </header>

      <section className='grid gap-4 sm:grid-cols-2'>
        <div className='grid gap-1 rounded-lg border border-gray-200 p-3'>
          <p className='text-xs font-semibold uppercase tracking-wide text-gray-500'>{td("buyer")}</p>
          <p className='font-semibold'>{buyer?.name}</p>
          <p>
            {buyer?.doc_type} {buyer?.doc_number}
            {buyer?.dv ? `-${buyer.dv}` : ""}
          </p>
          {buyer?.email ? <p className='text-gray-600'>{buyer.email}</p> : null}
          {buyer?.address || buyer?.city ? (
            <p className='text-gray-600'>{[buyer?.address, buyer?.city].filter(Boolean).join(", ")}</p>
          ) : null}
        </div>
        <dl className='grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border border-gray-200 p-3'>
          {invoice.order_id != null ? (
            <>
              <dt className='text-gray-500'>{td("order")}</dt>
              <dd className='text-right font-medium'>#{invoice.order_id}</dd>
            </>
          ) : null}
          <dt className='text-gray-500'>{td("paymentForm")}</dt>
          <dd className='text-right'>{td(`paymentForms.${invoice.payment_form === "CREDIT" ? "CREDIT" : "CASH"}`)}</dd>
          <dt className='text-gray-500'>{td("paymentMeans")}</dt>
          <dd className='text-right'>{invoice.payment_means ?? "—"}</dd>
          {isNote && invoice.related_number ? (
            <>
              <dt className='text-gray-500'>{td("references")}</dt>
              <dd className='text-right font-medium'>{invoice.related_number}</dd>
            </>
          ) : null}
          {isNote && invoice.reason ? (
            <>
              <dt className='text-gray-500'>{td("reason")}</dt>
              <dd className='text-right'>{invoice.reason}</dd>
            </>
          ) : null}
        </dl>
      </section>

      <div className='overflow-x-auto'>
        <table className='w-full min-w-[36rem] text-left'>
          <caption className='sr-only'>{td("lines")}</caption>
          <thead className='border-b border-gray-300 text-xs uppercase tracking-wide text-gray-500'>
            <tr>
              <th scope='col' className='py-2 pr-2'>#</th>
              <th scope='col' className='py-2 pr-2'>{td("description")}</th>
              <th scope='col' className='py-2 pr-2 text-right'>{td("quantity")}</th>
              <th scope='col' className='py-2 pr-2 text-right'>{td("unitPrice")}</th>
              <th scope='col' className='py-2 pr-2 text-right'>{td("discount")}</th>
              <th scope='col' className='py-2 pr-2 text-right'>{td("tax")}</th>
              <th scope='col' className='py-2 text-right'>{td("total")}</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.lines ?? []).map((line) => (
              <tr key={line.id ?? line.position} className='border-b border-gray-100 align-top'>
                <td className='py-2 pr-2 tabular-nums text-gray-500'>{line.position}</td>
                <td className='py-2 pr-2'>
                  <p className='font-medium'>{line.description}</p>
                  {line.sku_code ? <p className='font-mono text-xs text-gray-500'>{line.sku_code}</p> : null}
                </td>
                <td className='py-2 pr-2 text-right tabular-nums'>{line.quantity}</td>
                <td className='py-2 pr-2 text-right tabular-nums'>{formatMoney(line.unit_price)}</td>
                <td className='py-2 pr-2 text-right tabular-nums'>{line.discount ? formatMoney(line.discount) : "—"}</td>
                <td className='py-2 pr-2 text-right tabular-nums'>{Number(line.tax_rate ?? 0)} %</td>
                <td className='py-2 text-right font-medium tabular-nums'>{formatMoney(line.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className='grid gap-6 sm:grid-cols-[minmax(0,1fr)_18rem]'>
        <div className='grid content-start gap-2'>
          <p className='text-xs font-semibold uppercase tracking-wide text-gray-500'>{td("taxSummary")}</p>
          <table className='w-full text-left text-xs'>
            <thead className='text-gray-500'>
              <tr>
                <th scope='col' className='py-1 pr-2'>{td("taxRate")}</th>
                <th scope='col' className='py-1 pr-2 text-right'>{td("base")}</th>
                <th scope='col' className='py-1 text-right'>{td("tax")}</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.taxes ?? []).map((tax) => (
                <tr key={`${tax.tax_code}-${tax.tax_rate}`} className='border-t border-gray-100'>
                  <td className='py-1 pr-2'>
                    {tax.tax_kind === "EXCLUDED" ? td("excluded") : `${tax.tax_kind ?? ""} ${Number(tax.tax_rate ?? 0)} %`}
                  </td>
                  <td className='py-1 pr-2 text-right tabular-nums'>{formatMoney(tax.tax_base)}</td>
                  <td className='py-1 text-right tabular-nums'>{formatMoney(tax.tax_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className='grid gap-1.5 rounded-lg bg-gray-50 p-4'>
          <div className='flex justify-between'>
            <dt className='text-gray-600'>{td("subtotal")}</dt>
            <dd className='tabular-nums'>{formatMoney(invoice.net_amount)}</dd>
          </div>
          {invoice.discount_amount ? (
            <div className='flex justify-between'>
              <dt className='text-gray-600'>{td("discounts")}</dt>
              <dd className='tabular-nums'>{formatMoney(invoice.discount_amount)}</dd>
            </div>
          ) : null}
          <div className='flex justify-between'>
            <dt className='text-gray-600'>{td("taxes")}</dt>
            <dd className='tabular-nums'>{formatMoney(invoice.tax_amount)}</dd>
          </div>
          <div className='mt-1 flex justify-between border-t border-gray-200 pt-2 text-base font-bold'>
            <dt>{td("grandTotal")}</dt>
            <dd className='tabular-nums'>{formatMoney(invoice.total)}</dd>
          </div>
        </dl>
      </section>

      <footer className='grid gap-4 border-t border-gray-200 pt-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end'>
        <div className='grid gap-1.5 text-xs text-gray-600'>
          {!isNote && invoice.resolution_number ? (
            <p>
              {td("resolution", {
                number: invoice.resolution_number,
                range: invoice.resolution_range ?? "",
                validTo: invoice.resolution_valid_to ? formatLocalDate(invoice.resolution_valid_to) : "—",
              })}
            </p>
          ) : null}
          <p className='break-all'>
            <span className='font-semibold text-gray-800'>{isNote ? "CUDE" : "CUFE"}:</span> {invoice.cufe ?? td("noCufe")}
          </p>
          {invoice.verification_url ? (
            <p className='break-all'>
              {td("verify")}{" "}
              <a href={invoice.verification_url} target='_blank' rel='noopener noreferrer' className='text-blue-700 underline'>
                {invoice.verification_url}
              </a>
            </p>
          ) : null}
          <p>{td("provider", { provider: invoice.provider ?? "—" })}</p>
          {issuer?.invoice_footer ? <p className='whitespace-pre-line'>{issuer.invoice_footer}</p> : null}
        </div>
        {invoice.qr_data ? (
          <InvoiceQr data={invoice.qr_data} label={t("qrLabel", { number: invoice.full_number ?? "" })} />
        ) : (
          <div className={cn("flex h-[132px] w-[132px] items-center justify-center border border-dashed border-gray-300 p-2 text-center text-xs text-gray-500")}>
            {td("noQr")}
          </div>
        )}
      </footer>
    </article>
  );
};
