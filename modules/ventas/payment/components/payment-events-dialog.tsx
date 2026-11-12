/** @format */

"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@repo/ui/modals/scenes/dialog/modal";
import { formatApiDate, formatMoney } from "@/lib/format";
import { PaymentStatusBadge } from "../scenes/payment-status-badge";
import type { IPayment, IPaymentEvent } from "../models/payment.interface";
import { getPaymentEventsServerAction } from "@/app/[locale]/ventas/payments/actions";

/** Historial del pago: cambios desde el panel, webhooks y consultas a la pasarela. */
export const PaymentEventsDialog = ({ payment, onClose }: { payment: IPayment | null; onClose: () => void }) => {
  const t = useTranslations("Administre.payment");
  const [events, setEvents] = useState<IPaymentEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (payment?.id == null) return;
    let alive = true;
    setEvents(null);
    setError(null);
    getPaymentEventsServerAction(payment.id).then((result) => {
      if (!alive) return;
      if (result.success) setEvents(result.data);
      else setError(result.error);
    });
    return () => {
      alive = false;
    };
  }, [payment?.id]);

  return (
    <Modal
      size='lg'
      open={payment != null}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
      title={t("events.title")}
      description={payment ? `${payment.payment_reference ?? ""} · ${payment.method_name ?? ""}` : undefined}
      hideDefaultFooter>
      {payment ? (
        <div className='grid gap-4'>
          <dl className='grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/20 p-3 text-sm sm:grid-cols-4'>
            <div>
              <dt className='text-xs text-muted-foreground'>{t("fields.status")}</dt>
              <dd>
                <PaymentStatusBadge status={payment.status} />
              </dd>
            </div>
            <div>
              <dt className='text-xs text-muted-foreground'>{t("fields.amount")}</dt>
              <dd className='font-semibold tabular-nums'>{formatMoney(payment.amount)}</dd>
            </div>
            <div>
              <dt className='text-xs text-muted-foreground'>{t("fields.reference")}</dt>
              <dd className='truncate'>{payment.reference || "—"}</dd>
            </div>
            <div>
              <dt className='text-xs text-muted-foreground'>{t("fields.providerReference")}</dt>
              <dd className='truncate font-mono text-xs'>{payment.provider_reference || "—"}</dd>
            </div>
            {payment.status_detail ? (
              <div className='col-span-2 sm:col-span-4'>
                <dt className='text-xs text-muted-foreground'>{t("fields.statusDetail")}</dt>
                <dd>{payment.status_detail}</dd>
              </div>
            ) : null}
            {payment.notes ? (
              <div className='col-span-2 sm:col-span-4'>
                <dt className='text-xs text-muted-foreground'>{t("fields.notes")}</dt>
                <dd className='whitespace-pre-line'>{payment.notes}</dd>
              </div>
            ) : null}
          </dl>

          {error ? <p className='text-sm text-destructive'>{error}</p> : null}
          {events == null && !error ? <p className='text-sm text-muted-foreground'>{t("events.loading")}</p> : null}
          {events && events.length === 0 ? <p className='text-sm text-muted-foreground'>{t("events.empty")}</p> : null}
          {events && events.length > 0 ? (
            <ol className='relative grid gap-4 border-l border-border pl-5'>
              {events.map((event) => (
                <li key={event.id} className='relative'>
                  <span className='absolute -left-[1.6rem] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background' aria-hidden='true' />
                  <div className='flex flex-wrap items-center gap-2 text-sm'>
                    <span className='font-medium text-foreground'>{t.has(`events.types.${event.type}`) ? t(`events.types.${event.type}`) : event.type}</span>
                    {event.to_status ? <PaymentStatusBadge status={event.to_status} /> : null}
                    {event.amount != null ? <span className='tabular-nums text-muted-foreground'>{formatMoney(event.amount)}</span> : null}
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    {formatApiDate(event.created_at)} · {t.has(`events.sources.${event.source}`) ? t(`events.sources.${event.source}`) : event.source}
                  </p>
                  {event.detail ? <p className='mt-1 text-sm'>{event.detail}</p> : null}
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
};
