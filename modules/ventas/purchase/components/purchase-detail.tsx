/** @format */

"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { HiOutlineExclamationTriangle, HiOutlineShoppingBag, HiOutlineUser } from "react-icons/hi2";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/form-sections";
import { formatApiDate, formatMoney, formatNumber } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import { ORDERS_HREF } from "@/modules/ventas/order/models/order.interface";
import { OrderStatusBadge } from "@/modules/ventas/order/components/order-status-badge";
import { PURCHASES_HREF, type IPurchaseDetail } from "../models/purchase.interface";
import { PurchaseStatusBadge } from "./purchase-status-badge";

/**
 * Compra con sus subpedidos. Cada subpedido se paga, prepara, despacha y cancela en su propia
 * ficha de orden; aquí solo se ve el conjunto.
 */
export const PurchaseDetail = ({ purchase, checkout }: { purchase: IPurchaseDetail; checkout?: ReactNode }) => {
  const t = useTranslations("Administre.purchase");
  const td = useTranslations("Administre.purchase.detail");
  const tCrud = useTranslations("Crud");
  const hasExternal = purchase.sub_orders.some((order) => order.external);

  const customer: [string, string][] = [
    [t("fields.customer"), purchase.customer_name ?? "—"],
    [td("document"), [purchase.customer_doc_type, purchase.customer_doc_number].filter(Boolean).join(" ") || "—"],
    [td("email"), purchase.customer_email ?? "—"],
    [td("phone"), purchase.customer_phone ?? "—"],
    [td("createdBy"), purchase.created_by_name ?? purchase.created_by],
  ];

  return (
    <section className='flex w-full flex-col gap-6'>
      <Link href={PURCHASES_HREF} className='text-sm text-muted-foreground hover:text-foreground'>{td("back")}</Link>
      <PageHeader
        title={purchase.number}
        description={[t(`channels.${purchase.channel}` as never), purchase.created_at ? formatApiDate(purchase.created_at) : null].filter(Boolean).join(" · ")}
        icon={HiOutlineShoppingBag}
        eyebrow={tCrud("domains.sales")}
        actions={<PurchaseStatusBadge status={purchase.status} />}
      />

      {purchase.status === "PARTIALLY_PAID" ? (
        <p className='flex gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm'>
          <HiOutlineExclamationTriangle className='mt-0.5 h-5 w-5 shrink-0 text-amber-600' aria-hidden='true' />
          {td("partiallyPaid", { amount: formatMoney(purchase.pending_total) })}
        </p>
      ) : null}
      {hasExternal ? <p className='rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground'>{td("externalNotice")}</p> : null}

      <div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]'>
        <SectionCard id='purchase-orders' icon={HiOutlineShoppingBag} title={td("subOrders")} hint={td("subOrdersHint")} contentClassName='p-0'>
          <div className='col-span-12 overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead className='bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground'>
                <tr>
                  <th className='px-4 py-2'>{td("order")}</th>
                  <th className='px-4 py-2'>{td("seller")}</th>
                  <th className='px-4 py-2 text-right'>{td("units")}</th>
                  <th className='px-4 py-2 text-right'>{t("fields.total")}</th>
                  <th className='px-4 py-2'>{t("fields.status")}</th>
                </tr>
              </thead>
              <tbody>
                {purchase.sub_orders.map((order) => (
                  <tr key={order.order_id} className='border-t border-border'>
                    <td className='px-4 py-3'>
                      <Link href={`${ORDERS_HREF}/${order.order_id}`} className='font-medium hover:text-primary hover:underline'>
                        {order.order_number ?? `#${order.order_id}`}
                      </Link>
                    </td>
                    <td className='px-4 py-3'>
                      <p>{order.seller_name ?? td("ownStore")}</p>
                      <p className='text-xs text-muted-foreground'>{order.external ? td("external") : td("own")}</p>
                    </td>
                    <td className='px-4 py-3 text-right tabular-nums'>{formatNumber(order.units)}</td>
                    <td className='px-4 py-3 text-right tabular-nums'>{formatMoney(order.total)}</td>
                    <td className='px-4 py-3'><OrderStatusBadge state={order.state} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className='border-t border-border font-semibold'>
                  <td className='px-4 py-3' colSpan={3}>{td("activeTotal")}</td>
                  <td className='px-4 py-3 text-right tabular-nums'>{formatMoney(purchase.total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </SectionCard>

        <div className='grid content-start gap-6'>
        {checkout}
        <SectionCard id='purchase-customer' icon={HiOutlineUser} title={td("customer")} contentClassName='p-4'>
          <dl className='col-span-12 grid gap-2 text-sm'>
            {customer.map(([label, value]) => (
              <div key={label} className='flex justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2'>
                <dt className='text-muted-foreground'>{label}</dt>
                <dd className='text-right font-medium'>{value}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>
        </div>
      </div>
    </section>
  );
};
