/** @format */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@repo/ui/badges/scenes/badge";
import { Buttons } from "@repo/ui/buttons/scenes";
import { HiOutlineDocumentText, HiOutlineReceiptPercent } from "react-icons/hi2";
import { SectionCard } from "@/components/form-sections";
import { notify } from "@/components/notifications";
import { PageHeader } from "@/components/page-header";
import { StatCards } from "@/components/stat-cards";
import { formatNumber } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import { issue_seller_invoices_action } from "@/server/domains/marketplace/seller-invoices/actions";
import type { SellerInvoicePreviewDto } from "@/server/domains/marketplace/seller-invoices/types";
import { BILLING_HREF, formatCurrency } from "../models/marketplace.interface";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ISSUED: "outline", PENDING: "secondary", REJECTED: "destructive", VOIDED: "outline",
};

/**
 * Factura mensual de la plataforma a cada vendedor: comisiones, mensualidad, almacenamiento y cargos por
 * reclamos del mes (con IVA incluido). Lo recaudado por su cuenta se muestra aparte: esa venta la
 * factura el vendedor al comprador.
 */
export const SellerInvoices = ({ preview: initial, canManage }: { preview: SellerInvoicePreviewDto; canManage: boolean }) => {
  const router = useRouter();
  const t = useTranslations("Administre.marketplace.sellerInvoices");
  const tStatus = useTranslations("Administre.marketplace.sellerInvoices.statuses");
  const tCommon = useTranslations("Administre.common");
  const tCrud = useTranslations("Crud");
  const [preview, setPreview] = useState(initial);
  const [busy, setBusy] = useState(false);
  const money = (value: number) => formatCurrency(value, "COP");

  const issue = async (sellerIds: number[] | null) => {
    setBusy(true);
    const result = await issue_seller_invoices_action(preview.period, sellerIds);
    setBusy(false);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    setPreview(result.data.preview);
    notify.success(t("issued", { count: result.data.issued }), result.data.errors.join(" "));
  };

  return (
    <section className='flex w-full flex-col gap-6'>
      <Link href={BILLING_HREF} className='text-sm text-muted-foreground hover:text-foreground'>{t("back")}</Link>
      <PageHeader title={t("title")} description={t("description")} icon={HiOutlineReceiptPercent} eyebrow={tCrud("domains.marketplace")}
        actions={
          <div className='flex flex-wrap items-center gap-2'>
            <input type='month' value={preview.period} aria-label={t("period")}
              onChange={(e) => e.target.value && router.push(`${BILLING_HREF}/invoices?period=${e.target.value}`)}
              className='h-10 rounded-lg border border-input bg-background px-3 text-sm' />
            {canManage ? (
              <Buttons type='button' className='rounded-full' loading={busy} disabled={!preview.closed || preview.to_invoice === 0}
                onClick={() => void issue(null)}>
                {t("issueAll", { count: preview.to_invoice })}
              </Buttons>
            ) : null}
          </div>
        } />

      <StatCards items={[
        { label: t("stats.total"), value: money(preview.total), icon: HiOutlineReceiptPercent },
        { label: t("stats.toInvoice"), value: formatNumber(preview.to_invoice), icon: HiOutlineDocumentText,
          tone: preview.to_invoice > 0 ? "warning" : "default" },
        { label: t("stats.invoiced"), value: formatNumber(preview.invoiced), icon: HiOutlineDocumentText, tone: "success" },
      ]} />
      {!preview.closed ? <p className='rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm'>{t("openPeriod")}</p> : null}

      <SectionCard id='seller-invoices' icon={HiOutlineDocumentText} title={t("sellers", { count: preview.sellers.length })} hint={t("hint")}
        contentClassName='p-0'>
        <div className='col-span-12 overflow-x-auto'>
          {preview.sellers.length === 0 ? <p className='p-4 text-sm text-muted-foreground'>{t("empty")}</p> : (
            <table className='w-full text-sm'>
              <thead className='bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground'>
                <tr>
                  <th className='px-4 py-2'>{t("fields.seller")}</th>
                  <th className='px-4 py-2'>{t("fields.concepts")}</th>
                  <th className='px-4 py-2 text-right'>{t("fields.total")}</th>
                  <th className='px-4 py-2 text-right'>{t("fields.collected")}</th>
                  <th className='px-4 py-2'>{t("fields.invoice")}</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-border'>
                {preview.sellers.map((s) => (
                  <tr key={s.seller_id} className='align-top'>
                    <td className='px-4 py-2'>
                      <Link href={`/marketplace/sellers/${s.seller_id}`} className='font-medium hover:text-primary hover:underline'>{s.seller_name}</Link>
                      <p className='text-xs text-muted-foreground'>{s.doc}</p>
                      {s.missing.length > 0 ? <p className='text-xs text-destructive'>{t("missing", { fields: s.missing.join(", ") })}</p> : null}
                    </td>
                    <td className='px-4 py-2 text-xs'>
                      {s.concepts.map((c) => (
                        <p key={c.code} className='flex justify-between gap-3'><span>{c.description}</span><span className='tabular-nums'>{money(c.total)}</span></p>
                      ))}
                    </td>
                    <td className='px-4 py-2 text-right font-semibold tabular-nums'>{money(s.total)}</td>
                    <td className='px-4 py-2 text-right tabular-nums text-muted-foreground'>{money(s.collected)}</td>
                    <td className='px-4 py-2'>
                      {s.invoice ? (
                        <div className='grid gap-1'>
                          <Link href={`/facturacion/invoices/${s.invoice.invoice_id}`} className='font-mono text-xs font-semibold hover:text-primary hover:underline'>
                            {s.invoice.number ?? `#${s.invoice.invoice_id}`}
                          </Link>
                          <Badge variant={STATUS_VARIANT[s.invoice.status] ?? "outline"} className='w-fit'>{tStatus(s.invoice.status)}</Badge>
                          {s.invoice.detail ? <p className='text-xs text-muted-foreground'>{s.invoice.detail}</p> : null}
                        </div>
                      ) : canManage && preview.closed && s.total > 0 ? (
                        <Buttons type='button' variant='outline' className='h-8 rounded-full px-3 text-xs' loading={busy}
                          disabled={s.missing.length > 0} onClick={() => void issue([s.seller_id])}>{t("issueOne")}</Buttons>
                      ) : <span className='text-xs text-muted-foreground'>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </SectionCard>
    </section>
  );
};
