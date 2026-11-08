/** @format */

"use client";

import { useTranslations } from "next-intl";
import { HiOutlineArrowUturnLeft } from "react-icons/hi2";
import { SectionCard } from "@/components/form-sections";
import { formatApiDate, formatMoney } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import type { CustomerReturnsDto } from "@/server/domains/sales/customers/types";
import { DevolutionStatusBadge } from "./devolution-status-badge";

/** Devoluciones del cliente en su ficha 360 (las órdenes se relacionan por documento). */
export const CustomerReturns = ({ data }: { data: CustomerReturnsDto }) => {
  const t = useTranslations("Administre.devolution.customer");

  return (
    <SectionCard id='customer-returns' icon={HiOutlineArrowUturnLeft} title={t("title", { count: data.total })}
      hint={t("hint", { open: data.open, refunded: formatMoney(data.refunded) })} contentClassName='p-0'>
      {data.recent.length === 0 ? (
        <p className='col-span-12 p-4 text-sm text-muted-foreground'>{t("empty")}</p>
      ) : (
        <ul className='col-span-12 divide-y divide-border text-sm'>
          {data.recent.map((item) => (
            <li key={item.id} className='flex items-center justify-between gap-3 px-4 py-3'>
              <div className='min-w-0'>
                <Link href={`/postventa/devolutions/${item.id}`} className='font-medium hover:text-primary hover:underline'>
                  {t("label", { id: item.id })}
                </Link>
                <p className='text-xs text-muted-foreground'>
                  {[item.order_number ?? `#${item.order_id}`, item.created_at ? formatApiDate(item.created_at) : null].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className='grid justify-items-end gap-1 text-right'>
                <DevolutionStatusBadge state={item.state} />
                <span className='text-xs tabular-nums text-muted-foreground'>
                  {item.refunded > 0 ? t("refundedLine", { amount: formatMoney(item.refunded) })
                    : t("requestedLine", { amount: formatMoney(item.requested) })}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
};
