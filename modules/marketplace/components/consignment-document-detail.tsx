/** @format */

"use client";

import { useTranslations } from "next-intl";
import { HiOutlineArchiveBox, HiOutlineClipboardDocumentList, HiOutlinePrinter } from "react-icons/hi2";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/form-sections";
import { formatApiDate, formatNumber } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import { SELLERS_HREF } from "../models/marketplace.interface";
import { CONSIGNMENT_DOCUMENTS_HREF, type IConsignmentDocument } from "../models/consignment.interface";

/** Comprobante de recepción, devolución al vendedor o ajuste (imprimible). */
export const ConsignmentDocumentDetail = ({ document }: { document: IConsignmentDocument }) => {
  const t = useTranslations("Administre.marketplace.consignment");
  const tKinds = useTranslations("Administre.marketplace.consignment.kinds");
  const tCrud = useTranslations("Crud");
  const lines = document.lines ?? [];

  const info: [string, string | null][] = [
    [t("fields.kind"), tKinds(document.kind)],
    [t("fields.seller"), document.seller_name],
    [t("fields.warehouse"), document.warehouse_name ?? `#${document.warehouse_id}`],
    [t("fields.reference"), document.reference],
    [t("fields.units"), formatNumber(document.units)],
    [t("fields.by"), document.created_by_name ?? document.created_by],
    [t("fields.date"), document.created_at ? formatApiDate(document.created_at) : null],
  ];

  return (
    <section className='flex w-full flex-col gap-6'>
      <Link href={CONSIGNMENT_DOCUMENTS_HREF} className='text-sm text-muted-foreground hover:text-foreground print:hidden'>
        {t("backToDocuments")}
      </Link>
      <PageHeader
        title={document.number ?? `#${document.id}`}
        description={`${tKinds(document.kind)} · ${document.seller_name}`}
        icon={HiOutlineClipboardDocumentList}
        eyebrow={tCrud("domains.marketplace")}
        actions={
          <button type='button' onClick={() => window.print()}
            className='inline-flex h-9 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:bg-muted print:hidden'>
            <HiOutlinePrinter className='h-4 w-4' aria-hidden='true' />
            {t("print")}
          </button>
        }
      />
      <div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]'>
        <SectionCard id='consignment-document-lines' icon={HiOutlineArchiveBox} title={t("fields.lines", { count: lines.length })}
          contentClassName='p-0'>
          <div className='col-span-12 overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead className='bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground'>
                <tr>
                  <th className='px-4 py-2'>{t("fields.sku")}</th>
                  <th className='px-4 py-2 text-right'>{t("fields.quantity")}</th>
                  <th className='px-4 py-2 text-right'>{t("fields.balanceAfter")}</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} className='border-t border-border'>
                    <td className='px-4 py-3'>
                      <p className='font-mono'>{line.sku_code}</p>
                      <p className='text-xs text-muted-foreground'>{line.product_name ?? "—"}</p>
                    </td>
                    <td className='px-4 py-3 text-right font-semibold tabular-nums'>
                      {line.quantity > 0 ? `+${formatNumber(line.quantity)}` : formatNumber(line.quantity)}
                    </td>
                    <td className='px-4 py-3 text-right tabular-nums'>{formatNumber(line.balance_after)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
        <aside className='grid content-start gap-6'>
          <SectionCard id='consignment-document-info' icon={HiOutlineClipboardDocumentList} title={t("fields.data")} contentClassName='p-4'>
            <dl className='col-span-12 grid gap-2 text-sm'>
              {info.map(([label, value]) => (
                <div key={label} className='flex justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2'>
                  <dt className='text-muted-foreground'>{label}</dt>
                  <dd className='text-right font-medium'>{value || "—"}</dd>
                </div>
              ))}
            </dl>
            {document.notes ? <p className='col-span-12 mt-3 whitespace-pre-line text-sm text-muted-foreground'>{document.notes}</p> : null}
            <Link href={`${SELLERS_HREF}/${document.seller_id}`} className='col-span-12 mt-3 text-sm text-primary hover:underline print:hidden'>
              {t("viewSeller")}
            </Link>
          </SectionCard>
        </aside>
      </div>
    </section>
  );
};
