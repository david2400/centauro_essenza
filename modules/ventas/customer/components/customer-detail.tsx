/** @format */

"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { HiOutlineChartBar, HiOutlineIdentification, HiOutlinePencilSquare, HiOutlineShoppingBag, HiOutlineUserCircle } from "react-icons/hi2";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/form-sections";
import { formatApiDate, formatMoney, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Link } from "@/shared/i18n/routing";
import { ORDERS_HREF } from "@/modules/ventas/order/models/order.interface";
import { OrderStatusBadge } from "@/modules/ventas/order/components/order-status-badge";
import { CUSTOMERS_HREF, type ICustomerDetail } from "../models/customer.interface";

interface ICustomerDetailProps {
  customer: ICustomerDetail;
  canManage: boolean;
  /** Devoluciones del cliente (las compone la página con el módulo de postventa). */
  returns?: ReactNode;
  /** Facturas del cliente (las compone la página con el módulo de facturación). */
  invoices?: ReactNode;
}

/**
 * Ficha 360 del cliente: datos y consentimiento, indicadores de compra (neto de devoluciones y
 * cancelaciones), lo pendiente de pago, canales, últimas órdenes y su posventa. Las órdenes se
 * relacionan por documento.
 */
export const CustomerDetail = ({ customer, canManage, returns, invoices }: ICustomerDetailProps) => {
  const t = useTranslations("Administre.customer");
  const td = useTranslations("Administre.customer.detail");
  const tChannels = useTranslations("Administre.order.channels");
  const tCrud = useTranslations("Crud");
  const o = customer.overview;

  const kpis: [string, string, string?][] = [
    [td("spent"), formatMoney(o.spent), td("spentHint", { count: o.active_orders })],
    [td("averageTicket"), formatMoney(o.average_ticket)],
    [td("pending"), formatMoney(o.pending_amount), o.pending_orders > 0 ? td("pendingHint", { count: o.pending_orders }) : undefined],
    [td("returned"), formatMoney(o.returned), o.cancelled > 0 ? td("cancelledHint", { count: o.cancelled }) : undefined],
  ];

  const info: [string, string | null][] = [
    [t("fields.docNumber"), `${customer.doc_type} ${customer.doc_number}`],
    [t("fields.kind"), customer.kind === "COMPANY" ? td("company") : td("person")],
    [t("fields.email"), customer.email],
    [t("fields.phone"), customer.phone],
    [t("fields.address"), [customer.billing_address, customer.billing_city].filter(Boolean).join(", ") || null],
    [td("consent"), customer.marketing_consent
      ? td("consentYes", { date: customer.consent_at ? formatApiDate(customer.consent_at) : "—" }) : td("consentNo")],
    [td("source"), td(`sources.${customer.source}` as never)],
    [td("since"), customer.created_at ? formatApiDate(customer.created_at) : null],
  ];

  return (
    <section className='flex w-full flex-col gap-6'>
      <Link href={CUSTOMERS_HREF} className='text-sm text-muted-foreground hover:text-foreground'>{td("back")}</Link>
      <PageHeader
        title={customer.name}
        description={[`${customer.doc_type} ${customer.doc_number}`,
          o.last_order_at ? td("lastOrder", { days: o.days_since_last_order ?? 0 }) : td("noOrders")].join(" · ")}
        icon={HiOutlineUserCircle}
        eyebrow={tCrud("domains.sales")}
        actions={canManage ? (
          <Link href={`${CUSTOMERS_HREF}/${customer.id}/edit`}
            className='inline-flex h-9 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:bg-muted'>
            <HiOutlinePencilSquare className='h-4 w-4' aria-hidden='true' />
            {t("edit")}
          </Link>
        ) : undefined}
      />

      <dl className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        {kpis.map(([label, value, hint]) => (
          <div key={label} className='rounded-2xl border border-border bg-card p-4 shadow-sm'>
            <dt className='text-xs text-muted-foreground'>{label}</dt>
            <dd className='text-xl font-semibold tabular-nums'>{value}</dd>
            {hint ? <p className='text-xs text-muted-foreground'>{hint}</p> : null}
          </div>
        ))}
      </dl>

      <div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]'>
        <div className='grid content-start gap-6'>
          <SectionCard id='customer-orders' icon={HiOutlineShoppingBag} title={td("orders", { count: o.orders })} hint={td("ordersHint")} contentClassName='p-0'>
            {o.recent_orders.length === 0 ? (
              <p className='col-span-12 p-4 text-sm text-muted-foreground'>{td("noOrders")}</p>
            ) : (
              <div className='col-span-12 overflow-x-auto'>
                <table className='w-full text-sm'>
                  <thead className='bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground'>
                    <tr>
                      <th className='px-4 py-2'>{td("order")}</th>
                      <th className='px-4 py-2'>{td("channel")}</th>
                      <th className='px-4 py-2 text-right'>{td("total")}</th>
                      <th className='px-4 py-2'>{td("state")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {o.recent_orders.map((order) => (
                      <tr key={order.id} className='border-t border-border'>
                        <td className='px-4 py-3'>
                          <Link href={`${ORDERS_HREF}/${order.id}`} className='font-medium hover:text-primary hover:underline'>
                            {order.order_number ?? `#${order.id}`}
                          </Link>
                          <p className='text-xs text-muted-foreground'>{order.created_at ? formatApiDate(order.created_at) : ""}</p>
                        </td>
                        <td className='px-4 py-3'>
                          <p>{tChannels(order.channel as never)}</p>
                          {order.third_party ? <p className='text-xs text-muted-foreground'>{td("thirdParty")}</p> : null}
                        </td>
                        <td className='px-4 py-3 text-right tabular-nums'>
                          {formatMoney(order.total)}
                          {order.returned > 0 ? <span className='block text-xs text-muted-foreground'>{td("returnedLine", { amount: formatMoney(order.returned) })}</span> : null}
                        </td>
                        <td className='px-4 py-3'><OrderStatusBadge state={order.state} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
          {returns}
          {invoices}
          {customer.notes ? (
            <SectionCard id='customer-notes' icon={HiOutlineIdentification} title={t("fields.notes")} contentClassName='p-4'>
              <p className='col-span-12 whitespace-pre-line text-sm'>{customer.notes}</p>
            </SectionCard>
          ) : null}
        </div>
        <aside className='grid content-start gap-6'>
          <SectionCard id='customer-info' icon={HiOutlineIdentification} title={td("info")} contentClassName='p-4'>
            <dl className='col-span-12 grid gap-2 text-sm'>
              {info.map(([label, value]) => (
                <div key={label} className='flex justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2'>
                  <dt className='text-muted-foreground'>{label}</dt>
                  <dd className='text-right font-medium'>{value || "—"}</dd>
                </div>
              ))}
            </dl>
          </SectionCard>
          <SectionCard id='customer-channels' icon={HiOutlineChartBar} title={td("channels")} contentClassName='p-4'>
            <div className='col-span-12 grid gap-2 text-sm'>
              {o.by_channel.length === 0 ? <p className='text-muted-foreground'>—</p> : o.by_channel.map((channel) => (
                <div key={channel.channel} className='flex justify-between gap-3'>
                  <span>{tChannels(channel.channel as never)} · {formatNumber(channel.orders)}</span>
                  <span className='tabular-nums'>{formatMoney(channel.spent)}</span>
                </div>
              ))}
              <div className={cn("mt-2 grid gap-1 border-t border-border pt-2 text-xs text-muted-foreground")}>
                <p>{td("ownSpent", { amount: formatMoney(o.own_spent) })}</p>
                {o.marketplace_spent > 0 ? <p>{td("marketplaceSpent", { amount: formatMoney(o.marketplace_spent) })}</p> : null}
                {o.purchases > 0 ? <p>{td("purchases", { count: o.purchases })}</p> : null}
                {o.first_order_at ? <p>{td("firstOrder", { date: formatApiDate(o.first_order_at) })}</p> : null}
              </div>
            </div>
          </SectionCard>
        </aside>
      </div>
    </section>
  );
};
