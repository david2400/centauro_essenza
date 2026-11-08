/** @format */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Buttons } from "@repo/ui/buttons/scenes";
import { HiOutlineClock, HiOutlineCube, HiOutlineExclamationTriangle, HiOutlinePencilSquare, HiOutlineTag } from "react-icons/hi2";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/form-sections";
import { confirm, notify, prompt } from "@/components/notifications";
import { formatApiDate, formatNumber } from "@/lib/format";
import { Link } from "@/shared/i18n/routing";
import { offer_events_action, transition_offer_action } from "@/server/domains/marketplace/actions";
import {
  OFFER_ACTIONS,
  OFFER_REASON_REQUIRED,
  OFFERS_HREF,
  SELLERS_HREF,
  formatCurrency,
  type IMarketplaceAccess,
  type IOfferDetail,
  type IOfferEvent,
  type OfferAction,
} from "../models/marketplace.interface";
import { OfferStatusBadge, SellerStatusBadge } from "./badges";

const DANGER: readonly OfferAction[] = ["REJECT", "CLOSE", "PAUSE"];

/**
 * Ficha de la oferta con su moderación. Los botones salen de `allowed_actions` (estado + permisos
 * calculados por draco, que vuelve a validar todo al ejecutar, incluido el control de cuatro ojos).
 */
export const OfferDetail = ({ offer, access }: { offer: IOfferDetail; access: IMarketplaceAccess }) => {
  const t = useTranslations("Administre.marketplace.offer");
  const td = useTranslations("Administre.marketplace.offer.detail");
  const tActions = useTranslations("Administre.marketplace.offer.actions");
  const tConditions = useTranslations("Administre.marketplace.offer.conditions");
  const tCrud = useTranslations("Crud");
  const tCommon = useTranslations("Administre.common");
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const name = offer.sku.name ?? `SKU #${offer.sku.sku_id}`;
  const allowed = OFFER_ACTIONS.filter((action) => offer.allowed_actions.includes(action));
  const editable = access.offersManage && offer.editable_fields.length > 0;

  const run = async (action: OfferAction) => {
    let reason: string | undefined;
    if (OFFER_REASON_REQUIRED.includes(action)) {
      const value = await prompt({
        title: tActions(`${action}.title`, { name }),
        description: tActions(`${action}.description`),
        confirmLabel: tActions(`${action}.label`),
        tone: "danger",
        input: { label: td("reason"), multiline: true, required: true, placeholder: td("reasonPlaceholder") },
      });
      if (value == null || value.trim().length < 5) {
        if (value != null) notify.error(tCommon("errorTitle"), td("reasonTooShort"));
        return;
      }
      reason = value.trim();
    } else {
      const ok = await confirm({
        title: tActions(`${action}.title`, { name }),
        description: tActions(`${action}.description`),
        confirmLabel: tActions(`${action}.label`),
        tone: DANGER.includes(action) ? "danger" : undefined,
      });
      if (!ok) return;
    }
    setBusy(action);
    const result = await transition_offer_action(offer.id, { action, reason, lock_version: offer.lock_version });
    setBusy(null);
    if (!result.success) {
      notify.error(tCommon("errorTitle"), result.error);
      return;
    }
    notify.success(tActions(`${action}.done`), name);
    router.refresh();
  };

  const terms: [string, string][] = [
    [t("fields.price"), formatCurrency(offer.price, offer.currency)],
    [t("fields.quantity"), formatNumber(offer.available_quantity)],
    [t("fields.handlingDays"), td("days", { count: offer.handling_days })],
    [t("fields.condition"), tConditions(offer.condition as never)],
    [t("fields.sellerSku"), offer.seller_sku ?? "—"],
    [td("fulfillment"), td(`fulfillments.${offer.fulfillment}` as never)],
    [td("publishedAt"), offer.published_at ? formatApiDate(offer.published_at) : "—"],
  ];

  const catalog: [string, string][] = [
    [td("skuCode"), offer.sku.code ?? `#${offer.sku.sku_id}`],
    [td("catalogPrice"), offer.sku.catalog_price != null ? formatCurrency(offer.sku.catalog_price, offer.sku.catalog_currency) : "—"],
    [td("deviation"), offer.price_deviation_percent != null ? `${offer.price_deviation_percent > 0 ? "+" : ""}${offer.price_deviation_percent} %` : "—"],
    [td("sellable"), offer.sku.sellable ? td("yes") : td("no")],
  ];

  const warnings: string[] = [];
  if (offer.seller_status !== "APPROVED") warnings.push(td("sellerNotApproved"));
  if (!offer.sku.sellable) warnings.push(td("skuNotSellable"));
  if (offer.price_alert) warnings.push(td("priceAlert"));

  return (
    <section className='flex w-full flex-col gap-6'>
      <PageHeader
        title={name}
        description={[offer.seller_name, offer.sku.code, `#${offer.id}`].filter(Boolean).join(" · ")}
        icon={HiOutlineTag}
        eyebrow={tCrud("domains.marketplace")}
        actions={
          <div className='flex flex-wrap items-center gap-2'>
            <OfferStatusBadge status={offer.status} />
            {editable ? (
              <Link href={`${OFFERS_HREF}/${offer.id}/edit`}
                className='inline-flex h-9 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:bg-muted'>
                <HiOutlinePencilSquare className='h-4 w-4' aria-hidden='true' />
                {t("edit")}
              </Link>
            ) : null}
            {allowed.map((action) => (
              <Buttons key={action} type='button' size='sm' className='rounded-full'
                variant={DANGER.includes(action) ? "outline" : "default"} loading={busy === action} disabled={busy != null}
                onClick={() => void run(action)}>
                {tActions(`${action}.label`)}
              </Buttons>
            ))}
          </div>
        }
      />

      <p className={offer.visible
        ? "rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm"
        : "rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground"}>
        {offer.visible ? td("visible") : td("notVisible")}
      </p>

      {warnings.length > 0 ? (
        <div className='flex gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm'>
          <HiOutlineExclamationTriangle className='mt-0.5 h-5 w-5 shrink-0 text-amber-600' aria-hidden='true' />
          <ul className='grid gap-1'>{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
        </div>
      ) : null}

      {offer.status_reason && (offer.status === "REJECTED" || offer.status === "CLOSED") ? (
        <div className='rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm'>
          <p className='font-medium'>{td("statusReason")}</p>
          <p className='text-muted-foreground'>{offer.status_reason}</p>
        </div>
      ) : null}

      <div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]'>
        <div className='grid content-start gap-6'>
          <SectionCard id='offer-terms' icon={HiOutlineTag} title={td("terms")} contentClassName='p-4'>
            <Rows rows={terms} />
          </SectionCard>
          <OfferHistory offerId={offer.id} />
        </div>
        <div className='grid content-start gap-6'>
          <SectionCard id='offer-catalog' icon={HiOutlineCube} title={td("catalog")} hint={td("catalogHint")} contentClassName='p-4'>
            <Rows rows={catalog} />
          </SectionCard>
          <SectionCard id='offer-seller' icon={HiOutlineCube} title={t("fields.seller")} contentClassName='p-4'>
            <div className='col-span-12 flex flex-wrap items-center justify-between gap-2 text-sm'>
              <Link href={`${SELLERS_HREF}/${offer.seller_id}`} className='font-medium hover:text-primary hover:underline'>{offer.seller_name}</Link>
              <SellerStatusBadge status={offer.seller_status} />
            </div>
          </SectionCard>
        </div>
      </div>
    </section>
  );
};

const Rows = ({ rows }: { rows: [string, string][] }) => (
  <dl className='col-span-12 grid gap-2 text-sm sm:grid-cols-2'>
    {rows.map(([label, value]) => (
      <div key={label} className='flex justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2'>
        <dt className='text-muted-foreground'>{label}</dt>
        <dd className='text-right font-medium tabular-nums'>{value}</dd>
      </div>
    ))}
  </dl>
);

const OfferHistory = ({ offerId }: { offerId: number }) => {
  const th = useTranslations("Administre.marketplace.history");
  const [events, setEvents] = useState<IOfferEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    const result = await offer_events_action(offerId);
    setLoading(false);
    if (result.success) {
      setEvents(result.data);
      setError(null);
    } else setError(result.error);
  };
  return (
    <SectionCard id='offer-history' icon={HiOutlineClock} title={th("title")}
      actions={<Buttons type='button' size='sm' variant='outline' className='rounded-full' loading={loading} onClick={() => void load()}>{events ? th("reload") : th("load")}</Buttons>}
      contentClassName='p-4'>
      {error ? <p className='col-span-12 text-sm text-destructive'>{error}</p> : null}
      {events == null ? (
        <p className='col-span-12 text-sm text-muted-foreground'>{th("notLoaded")}</p>
      ) : events.length === 0 ? (
        <p className='col-span-12 text-sm text-muted-foreground'>{th("empty")}</p>
      ) : (
        <ol className='col-span-12 grid gap-2'>
          {events.map((event) => (
            <li key={event.id} className='rounded-lg border border-border px-3 py-2 text-sm'>
              <p className='font-medium'>{th(`types.${event.type}` as never)}</p>
              {event.reason ? <p className='text-xs'>{event.reason}</p> : null}
              {event.detail ? <p className='text-xs text-muted-foreground'>{event.detail}</p> : null}
              <p className='text-xs text-muted-foreground'>{[formatApiDate(event.created_at), event.actor_name ?? event.actor_id].filter(Boolean).join(" · ")}</p>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
};
