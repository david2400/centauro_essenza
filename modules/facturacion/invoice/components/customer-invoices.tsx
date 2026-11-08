/** @format */

"use client";

import { useTranslations } from "next-intl";
import { HiOutlineDocumentText } from "react-icons/hi2";
import { SectionCard } from "@/components/form-sections";
import { formatApiDate, formatMoney } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import type { CustomerInvoicesDto } from "@/server/domains/sales/customers/types";
import { InvoiceStatusBadge } from "./invoice-status-badge";

/** Facturas y notas crédito del cliente en su ficha 360. */
export const CustomerInvoices = ({ data }: { data: CustomerInvoicesDto }) => {
  const t = useTranslations("Administre.billing.invoice.customer");
  const tKinds = useTranslations("Administre.billing.invoice.kinds");

  return (
    <SectionCard id='customer-invoices' icon={HiOutlineDocumentText}
      title={t("title", { count: data.invoices + data.credit_notes })}
      hint={[t("invoiced", { amount: formatMoney(data.invoiced) }), data.pending > 0 ? t("pending", { count: data.pending }) : null]
        .filter(Boolean).join(" · ")}
      contentClassName='p-0'>
      {data.recent.length === 0 ? (
        <p className='col-span-12 p-4 text-sm text-muted-foreground'>{t("empty")}</p>
      ) : (
        <ul className='col-span-12 divide-y divide-border text-sm'>
          {data.recent.map((item) => (
            <li key={item.id} className='flex items-center justify-between gap-3 px-4 py-3'>
              <div className='min-w-0'>
                <Link href={`/facturacion/invoices/${item.id}`} className='font-mono font-medium hover:text-primary hover:underline'>
                  {item.number}
                </Link>
                <p className='text-xs text-muted-foreground'>
                  {[tKinds(item.kind as never), item.issued_at ? formatApiDate(item.issued_at) : null].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className='grid justify-items-end gap-1 text-right'>
                <InvoiceStatusBadge status={item.status} />
                <span className='text-xs tabular-nums text-muted-foreground'>
                  {item.kind === "CREDIT_NOTE" ? `− ${formatMoney(item.total)}` : formatMoney(item.total)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
};
